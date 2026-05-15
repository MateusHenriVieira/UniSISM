/**
 * Ajuda de custo a paciente — workflow PENDENTE → AUTORIZADA → PAGA (ou NEGADA).
 *
 * Anti-fraude: índice único `(viagemId, pacienteId)` garante que cada paciente
 * recebe no máximo uma ajuda por viagem (Prisma DB-level).
 *
 * Saldo (TFD §7.8):
 *   - solicitar  → reserva valorTotal em SaldoAjudaCusto.saldoReservado
 *   - autorizar  → mantém reserva
 *   - negar      → libera reserva
 *   - pagar      → libera reserva + debita em saldoConsumido
 *
 * Tetos por categoria (TFD §9 + §11): cada item tem que respeitar o teto da
 * categoria (0 = sem teto). Validado no `solicitar`.
 */
import type { Request } from 'express';
import { Conflict, NotFound, Unprocessable } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { Prisma } from '../../../../generated/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IFileStorage } from '../../../domain/services/IFileStorage';
import type { ITfdAuditLogger } from '../infrastructure/TfdAuditLogger';
import {
  assertMesmaPrefeitura,
  ctxAudit,
  proximoProtocoloTfd,
  resolverOperador,
  resolverPrefeituraIdEfetiva,
} from './_helpers';

export type CategoriaItemAjuda = 'ALIMENTACAO' | 'HOSPEDAGEM' | 'DESLOCAMENTO_LOCAL' | 'OUTRO';

export interface ItemAjudaCusto {
  categoria: CategoriaItemAjuda;
  descricao: string;
  valorBRL: number;
}

export interface SolicitarAjudaInput {
  viagemId: string;
  pacienteId: string;
  itens: ItemAjudaCusto[];
}

export interface PagarAjudaInput {
  metodoPagamento: 'PIX' | 'TRANSFERENCIA' | 'DINHEIRO_RH';
  comprovante: { nomeOriginal: string; mimeType: string; buffer: Buffer };
}

const MIMES_OK = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

function rowParaAjuda(r: any) {
  return {
    id: r.id,
    protocolo: r.protocolo,
    viagemId: r.viagemId,
    pacienteId: r.pacienteId,
    pacienteNome: r.paciente?.nome ?? null,
    pacienteCpf: r.paciente?.cpf ?? null,
    itens: r.itens,
    valorTotal: Number(r.valorTotal),
    status: r.status,
    metodoPagamento: r.metodoPagamento,
    motivoNegacao: r.motivoNegacao,
    temComprovante: !!r.comprovantePagamentoKey,
    criadaEm: r.criadaEm.toISOString(),
    autorizadaEm: r.autorizadaEm?.toISOString() ?? null,
    pagaEm: r.pagaEm?.toISOString() ?? null,
    prefeituraId: r.prefeituraId,
  };
}

const INCLUDE_FULL = {
  paciente: { select: { id: true, nome: true, cpf: true } },
};

function mesDaViagem(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

interface TetosCarregados {
  ALIMENTACAO: number;
  HOSPEDAGEM: number;
  DESLOCAMENTO_LOCAL: number;
  OUTRO: number;
  saldoMensal: number;
  saldoConsumido: number;
  saldoReservado: number;
}

async function carregarSaldoAjudaCusto(
  prefeituraId: string,
  mes: string,
): Promise<TetosCarregados> {
  const s = await prisma.saldoAjudaCusto.findUnique({
    where: { prefeituraId_mes: { prefeituraId, mes } },
  });
  return {
    ALIMENTACAO: Number(s?.tetoAlimentacao ?? 0),
    HOSPEDAGEM: Number(s?.tetoHospedagem ?? 0),
    DESLOCAMENTO_LOCAL: Number(s?.tetoDeslocamento ?? 0),
    OUTRO: 0,
    saldoMensal: Number(s?.saldoMensal ?? 0),
    saldoConsumido: Number(s?.saldoConsumido ?? 0),
    saldoReservado: Number(s?.saldoReservado ?? 0),
  };
}

export class AjudasCustoUseCases {
  constructor(
    private readonly audit: ITfdAuditLogger,
    private readonly atendentes: IAtendenteRepository,
    private readonly storage: IFileStorage,
  ) {}

  async listar(
    scope: AccessScope,
    req: Request,
    filtros: { status?: string; pacienteId?: string },
  ) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const where: Prisma.AjudaCustoWhereInput = { prefeituraId };
    if (filtros.status) where.status = filtros.status as any;
    if (filtros.pacienteId) where.pacienteId = filtros.pacienteId;
    const rows = await prisma.ajudaCusto.findMany({
      where,
      include: INCLUDE_FULL,
      orderBy: { criadaEm: 'desc' },
      take: 200,
    });
    return rows.map(rowParaAjuda);
  }

  async porId(scope: AccessScope, id: string) {
    const r = await prisma.ajudaCusto.findUnique({ where: { id }, include: INCLUDE_FULL });
    if (!r) throw NotFound('AJUDA_NAO_ENCONTRADA', 'Ajuda de custo não encontrada');
    assertMesmaPrefeitura(scope, r.prefeituraId);
    return rowParaAjuda(r);
  }

  async solicitar(scope: AccessScope, req: Request, autorId: string, input: SolicitarAjudaInput) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const viagem = await prisma.viagemFrota.findUnique({ where: { id: input.viagemId } });
    if (!viagem || viagem.prefeituraId !== prefeituraId) {
      throw NotFound('VIAGEM_NAO_ENCONTRADA', 'Viagem não encontrada');
    }
    if (input.itens.length === 0) {
      throw Unprocessable('ITENS_OBRIGATORIOS', 'Informe pelo menos um item de ajuda');
    }
    for (const it of input.itens) {
      if (!Number.isFinite(it.valorBRL) || it.valorBRL <= 0) {
        throw Unprocessable('VALOR_INVALIDO', 'Cada item deve ter valorBRL > 0');
      }
    }

    // Paciente precisa estar alocado nesta viagem
    const eAlocado = await prisma.viagemPassageiro.findFirst({
      where: { viagemId: input.viagemId, pacienteId: input.pacienteId },
      select: { id: true },
    });
    if (!eAlocado) {
      throw Unprocessable(
        'PAYLOAD_INVALIDO',
        'Paciente não está alocado nesta viagem',
      );
    }

    // Anti-fraude: já existe ajuda ativa para este (viagem, paciente)?
    const dup = await prisma.ajudaCusto.findFirst({
      where: {
        viagemId: input.viagemId,
        pacienteId: input.pacienteId,
        status: { notIn: ['NEGADA', 'CANCELADA'] },
      },
    });
    if (dup) {
      throw Conflict(
        'AJUDA_DUPLICADA',
        `Paciente já tem ajuda de custo ${dup.protocolo} (status ${dup.status}) nesta viagem`,
      );
    }

    const valorTotal = +input.itens.reduce((acc, i) => acc + i.valorBRL, 0).toFixed(2);
    const mes = mesDaViagem(viagem.data);
    const saldo = await carregarSaldoAjudaCusto(prefeituraId, mes);

    // Valida teto por categoria (0 = sem teto)
    for (const it of input.itens) {
      const teto = saldo[it.categoria];
      if (teto > 0 && it.valorBRL > teto) {
        throw Unprocessable(
          'TETO_CATEGORIA_EXCEDIDO',
          `Item ${it.categoria} (R$ ${it.valorBRL.toFixed(2)}) excede teto R$ ${teto.toFixed(2)}`,
          { categoria: it.categoria, valorBRL: it.valorBRL, teto },
        );
      }
    }

    // Valida saldo disponível
    const disponivel = +(saldo.saldoMensal - saldo.saldoConsumido - saldo.saldoReservado).toFixed(2);
    if (valorTotal > disponivel) {
      throw Unprocessable(
        'SALDO_AJUDA_INSUFICIENTE',
        `Saldo de ajuda de custo (R$ ${disponivel.toFixed(2)}) insuficiente para reservar R$ ${valorTotal.toFixed(2)}`,
        { mes, saldoDisponivel: disponivel, valorSolicitado: valorTotal },
      );
    }

    const op = await resolverOperador(this.atendentes, autorId, prefeituraId);
    const protocolo = await proximoProtocoloTfd('AJC');

    const novo = await prisma.$transaction(async (tx) => {
      const r = await tx.ajudaCusto.create({
        data: {
          protocolo,
          prefeituraId,
          viagemId: input.viagemId,
          pacienteId: input.pacienteId,
          itens: input.itens as unknown as Prisma.InputJsonValue,
          valorTotal,
          criadaPorId: autorId,
        },
        include: INCLUDE_FULL,
      });
      await tx.saldoAjudaCusto.upsert({
        where: { prefeituraId_mes: { prefeituraId, mes } },
        update: { saldoReservado: { increment: valorTotal } },
        create: {
          prefeituraId,
          mes,
          saldoReservado: valorTotal,
        },
      });
      return r;
    });

    await this.audit.registrar({
      prefeituraId,
      acao: 'AJUDA_CUSTO_CRIADA',
      recursoTipo: 'AJUDA_CUSTO',
      recursoId: novo.id,
      recursoProtocolo: novo.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { protocolo, valorTotal, itens: input.itens.length, mes },
    });
    return rowParaAjuda(novo);
  }

  async autorizar(scope: AccessScope, req: Request, autorId: string, id: string) {
    const atual = await prisma.ajudaCusto.findUnique({ where: { id } });
    if (!atual) throw NotFound('AJUDA_NAO_ENCONTRADA', 'Ajuda de custo não encontrada');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    if (atual.status !== 'PENDENTE') {
      throw Conflict('STATUS_INVALIDO', `Só pode autorizar PENDENTE (atual: ${atual.status})`);
    }
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    const updated = await prisma.ajudaCusto.update({
      where: { id },
      data: {
        status: 'AUTORIZADA',
        autorizadaEm: new Date(),
        autorizadaPorId: autorId,
      },
      include: INCLUDE_FULL,
    });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'AJUDA_CUSTO_AUTORIZADA',
      recursoTipo: 'AJUDA_CUSTO',
      recursoId: id,
      recursoProtocolo: atual.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { status: 'AUTORIZADA' },
    });
    return rowParaAjuda(updated);
  }

  async pagar(scope: AccessScope, req: Request, autorId: string, id: string, input: PagarAjudaInput) {
    const atual = await prisma.ajudaCusto.findUnique({
      where: { id },
      include: { viagem: { select: { data: true } } },
    });
    if (!atual) throw NotFound('AJUDA_NAO_ENCONTRADA', 'Ajuda de custo não encontrada');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    if (atual.status !== 'AUTORIZADA') {
      throw Conflict('STATUS_INVALIDO', `Só pode pagar AUTORIZADA (atual: ${atual.status})`);
    }
    if (!MIMES_OK.has(input.comprovante.mimeType)) {
      throw Unprocessable('MIME_NAO_SUPORTADO', 'Comprovante deve ser PDF, JPEG ou PNG');
    }
    if (input.comprovante.buffer.length > MAX_BYTES) {
      throw Unprocessable('ARQUIVO_MUITO_GRANDE', 'Comprovante excede 10 MB');
    }
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);
    const valorTotal = Number(atual.valorTotal);
    const mes = mesDaViagem(atual.viagem.data);

    const pasta = `tfd/${atual.prefeituraId}/ajudas-custo/${new Date().toISOString().slice(0, 7)}`;
    const arq = await this.storage.salvar({
      nomeOriginal: input.comprovante.nomeOriginal,
      mimeType: input.comprovante.mimeType,
      buffer: input.comprovante.buffer,
      pasta,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.ajudaCusto.update({
        where: { id },
        data: {
          status: 'PAGA',
          metodoPagamento: input.metodoPagamento,
          comprovantePagamentoKey: arq.caminho,
          pagaEm: new Date(),
          pagaPorId: autorId,
        },
        include: INCLUDE_FULL,
      });
      await tx.saldoAjudaCusto.upsert({
        where: { prefeituraId_mes: { prefeituraId: atual.prefeituraId, mes } },
        update: {
          saldoReservado: { decrement: valorTotal },
          saldoConsumido: { increment: valorTotal },
        },
        create: {
          prefeituraId: atual.prefeituraId,
          mes,
          saldoConsumido: valorTotal,
        },
      });
      return r;
    });

    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'AJUDA_CUSTO_PAGA',
      recursoTipo: 'AJUDA_CUSTO',
      recursoId: id,
      recursoProtocolo: atual.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { metodo: input.metodoPagamento, valorTotal, mes },
    });
    return rowParaAjuda(updated);
  }

  async negar(scope: AccessScope, req: Request, autorId: string, id: string, motivo: string) {
    const atual = await prisma.ajudaCusto.findUnique({
      where: { id },
      include: { viagem: { select: { data: true } } },
    });
    if (!atual) throw NotFound('AJUDA_NAO_ENCONTRADA', 'Ajuda de custo não encontrada');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    if (atual.status !== 'PENDENTE') {
      throw Conflict('STATUS_INVALIDO', `Só pode negar PENDENTE (atual: ${atual.status})`);
    }
    if (motivo.trim().length < 10) {
      throw Unprocessable('MOTIVO_OBRIGATORIO', 'Motivo deve ter ≥ 10 caracteres');
    }
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);
    const valorTotal = Number(atual.valorTotal);
    const mes = mesDaViagem(atual.viagem.data);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.ajudaCusto.update({
        where: { id },
        data: { status: 'NEGADA', motivoNegacao: motivo.trim() },
        include: INCLUDE_FULL,
      });
      // Libera reserva
      await tx.saldoAjudaCusto.upsert({
        where: { prefeituraId_mes: { prefeituraId: atual.prefeituraId, mes } },
        update: { saldoReservado: { decrement: valorTotal } },
        create: {
          prefeituraId: atual.prefeituraId,
          mes,
          saldoReservado: 0,
        },
      });
      return r;
    });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'AJUDA_CUSTO_NEGADA',
      recursoTipo: 'AJUDA_CUSTO',
      recursoId: id,
      recursoProtocolo: atual.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { motivo, mes, reservaLiberada: valorTotal },
    });
    return rowParaAjuda(updated);
  }
}
