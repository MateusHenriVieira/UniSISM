/**
 * CRUD de veículos da frota TFD.
 * Cada mutação grava uma linha em `tfd_audit_log` (cadeia hash).
 */
import type { Request } from 'express';
import { Conflict, NotFound } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { ITfdAuditLogger } from '../infrastructure/TfdAuditLogger';
import {
  assertMesmaPrefeitura,
  ctxAudit,
  resolverOperador,
  resolverPrefeituraIdEfetiva,
} from './_helpers';

export interface CriarVeiculoInput {
  placa: string;
  modelo: string;
  tipo: 'VAN' | 'ONIBUS' | 'CARRO' | 'AMBULANCIA';
  capacidade: number;
  ano: number;
  combustivel: 'DIESEL' | 'GASOLINA' | 'ETANOL' | 'FLEX' | 'GNV' | 'ELETRICO';
  consumoMedioKml: number;
  hodometroAtualKm?: number;
  proximaRevisaoKm?: number | null;
  proximaRevisaoEm?: string | null; // YYYY-MM-DD
}

export interface AtualizarVeiculoInput extends Partial<CriarVeiculoInput> {
  status?: 'ATIVO' | 'EM_MANUTENCAO' | 'INATIVO';
}

function rowParaVeiculo(r: any) {
  return {
    id: r.id,
    placa: r.placa,
    modelo: r.modelo,
    tipo: r.tipo,
    capacidade: r.capacidade,
    ano: r.ano,
    combustivel: r.combustivel,
    consumoMedioKml: Number(r.consumoMedioKml),
    hodometroAtualKm: Number(r.hodometroAtualKm),
    proximaRevisaoKm: r.proximaRevisaoKm ? Number(r.proximaRevisaoKm) : null,
    proximaRevisaoEm: r.proximaRevisaoEm ? r.proximaRevisaoEm.toISOString().slice(0, 10) : null,
    status: r.status,
    prefeituraId: r.prefeituraId,
    criadoEm: r.criadoEm.toISOString(),
    atualizadoEm: r.atualizadoEm.toISOString(),
  };
}

/**
 * Resumo de uma viagem do veículo + passageiros (para o histórico que aparece
 * no detalhe do veículo `/tfd/frota/[id]`). Cada passageiro traz `presenca`
 * (AGUARDANDO | CONFIRMADO | EMBARCADO | AUSENTE | DESISTIU) — o frontend
 * filtra "viajaram" (EMBARCADO) vs "faltaram" (AUSENTE / DESISTIU).
 */
function viagemHistoricoResumo(v: any) {
  const kmInicial = v.kmInicialHodometro != null ? Number(v.kmInicialHodometro) : null;
  const kmFinal = v.kmFinalHodometro != null ? Number(v.kmFinalHodometro) : null;
  const kmRodados = kmInicial != null && kmFinal != null ? kmFinal - kmInicial : null;

  return {
    id: v.id,
    data: v.data.toISOString().slice(0, 10),
    horaSaida: v.horaSaida,
    horaPrevistaRetorno: v.horaPrevistaRetorno ?? null,
    destino: v.destino,
    unidadeDestino: v.unidadeDestino ?? null,
    rotaResumo: v.rotaResumo ?? null,
    status: v.status,
    motorista: v.motorista
      ? { id: v.motorista.id, nome: v.motorista.nome }
      : null,
    vagasTotais: v.vagasTotais,
    kmEstimados: v.kmEstimados ?? null,
    kmInicialHodometro: kmInicial,
    kmFinalHodometro: kmFinal,
    kmRodados,
    observacoes: v.observacoes ?? null,
    motivoCancelamento: v.motivoCancelamento ?? null,
    iniciadaEm: v.iniciadaEm ? v.iniciadaEm.toISOString() : null,
    concluidaEm: v.concluidaEm ? v.concluidaEm.toISOString() : null,
    criadaEm: v.criadaEm.toISOString(),
    passageiros: (v.passageiros ?? []).map((p: any) => ({
      id: p.id,
      solicitacaoId: p.solicitacaoId,
      pacienteId: p.pacienteId,
      pacienteNome: p.paciente?.nome ?? null,
      numeroAssento: p.numeroAssento ?? null,
      acompanhante: p.acompanhante,
      presenca: p.presenca,
      observacao: p.observacao ?? null,
      marcadoEm: p.marcadoEm ? p.marcadoEm.toISOString() : null,
    })),
  };
}

/**
 * Soma total de KM rodados em viagens CONCLUIDAS (descarta CANCELADA/AGENDADA
 * e viagens sem hodômetro completo).
 */
function calcularTotalKmRodados(viagens: any[]): number {
  let total = 0;
  for (const v of viagens) {
    if (v.status !== 'CONCLUIDA') continue;
    if (v.kmInicialHodometro == null || v.kmFinalHodometro == null) continue;
    total += Number(v.kmFinalHodometro) - Number(v.kmInicialHodometro);
  }
  return total;
}

export class VeiculosTfdUseCases {
  constructor(
    private readonly audit: ITfdAuditLogger,
    private readonly atendentes: IAtendenteRepository,
  ) {}

  async listar(scope: AccessScope, req: Request) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const rows = await prisma.veiculoTFD.findMany({
      where: { prefeituraId, deletadoEm: null },
      orderBy: { placa: 'asc' },
    });
    if (rows.length === 0) return [];

    // Computa `totalViagens` por veículo em uma única query (evita N+1).
    const ids = rows.map((r) => r.id);
    const counts = await prisma.viagemFrota.groupBy({
      by: ['veiculoId'],
      where: { veiculoId: { in: ids } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.veiculoId, c._count._all]));

    return rows.map((r) => ({
      ...rowParaVeiculo(r),
      totalViagens: countMap.get(r.id) ?? 0,
    }));
  }

  async porId(scope: AccessScope, id: string) {
    const r = await prisma.veiculoTFD.findUnique({ where: { id } });
    if (!r || r.deletadoEm) throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    assertMesmaPrefeitura(scope, r.prefeituraId);

    // Histórico completo de viagens do veículo (mais recentes primeiro), com
    // motorista e passageiros (incluindo `presenca` para o frontend distinguir
    // quem viajou — `EMBARCADO` — de quem faltou — `AUSENTE` / `DESISTIU`).
    const viagens = await prisma.viagemFrota.findMany({
      where: { veiculoId: id },
      orderBy: [{ data: 'desc' }, { horaSaida: 'desc' }],
      include: {
        motorista: { select: { id: true, nome: true } },
        passageiros: {
          orderBy: { numeroAssento: 'asc' },
          include: {
            paciente: { select: { id: true, nome: true } },
          },
        },
      },
    });

    return {
      ...rowParaVeiculo(r),
      totalViagens: viagens.length,
      totalKmRodados: calcularTotalKmRodados(viagens),
      historicoViagens: viagens.map(viagemHistoricoResumo),
    };
  }

  async criar(scope: AccessScope, req: Request, autorId: string, input: CriarVeiculoInput) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const op = await resolverOperador(this.atendentes, autorId, prefeituraId);

    // Placa única (entre não-deletados da prefeitura)
    const placa = input.placa.trim().toUpperCase();
    const dup = await prisma.veiculoTFD.findFirst({
      where: { prefeituraId, placa, deletadoEm: null },
      select: { id: true },
    });
    if (dup) throw Conflict('PLACA_DUPLICADA', `Já existe um veículo com placa ${placa} ativo`);

    const novo = await prisma.veiculoTFD.create({
      data: {
        prefeituraId,
        placa,
        modelo: input.modelo.trim(),
        tipo: input.tipo,
        capacidade: input.capacidade,
        ano: input.ano,
        combustivel: input.combustivel,
        consumoMedioKml: input.consumoMedioKml,
        hodometroAtualKm: BigInt(input.hodometroAtualKm ?? 0),
        proximaRevisaoKm: input.proximaRevisaoKm ? BigInt(input.proximaRevisaoKm) : null,
        proximaRevisaoEm: input.proximaRevisaoEm
          ? new Date(`${input.proximaRevisaoEm}T00:00:00.000Z`)
          : null,
        criadoPorId: autorId,
      },
    });

    await this.audit.registrar({
      prefeituraId,
      acao: 'VEICULO_CRIADO',
      recursoTipo: 'VEICULO',
      recursoId: novo.id,
      recursoProtocolo: novo.placa,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { placa: novo.placa, modelo: novo.modelo, tipo: novo.tipo, capacidade: novo.capacidade },
    });

    return rowParaVeiculo(novo);
  }

  async atualizar(
    scope: AccessScope,
    req: Request,
    autorId: string,
    id: string,
    input: AtualizarVeiculoInput,
  ) {
    const atual = await prisma.veiculoTFD.findUnique({ where: { id } });
    if (!atual || atual.deletadoEm) throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    const data: Record<string, unknown> = {};
    if (input.placa !== undefined) data['placa'] = input.placa.trim().toUpperCase();
    if (input.modelo !== undefined) data['modelo'] = input.modelo.trim();
    if (input.tipo !== undefined) data['tipo'] = input.tipo;
    if (input.capacidade !== undefined) data['capacidade'] = input.capacidade;
    if (input.ano !== undefined) data['ano'] = input.ano;
    if (input.combustivel !== undefined) data['combustivel'] = input.combustivel;
    if (input.consumoMedioKml !== undefined) data['consumoMedioKml'] = input.consumoMedioKml;
    if (input.hodometroAtualKm !== undefined)
      data['hodometroAtualKm'] = BigInt(input.hodometroAtualKm);
    if (input.proximaRevisaoKm !== undefined)
      data['proximaRevisaoKm'] = input.proximaRevisaoKm ? BigInt(input.proximaRevisaoKm) : null;
    if (input.proximaRevisaoEm !== undefined)
      data['proximaRevisaoEm'] = input.proximaRevisaoEm
        ? new Date(`${input.proximaRevisaoEm}T00:00:00.000Z`)
        : null;
    if (input.status !== undefined) data['status'] = input.status;

    const updated = await prisma.veiculoTFD.update({ where: { id }, data });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'VEICULO_ATUALIZADO',
      recursoTipo: 'VEICULO',
      recursoId: id,
      recursoProtocolo: updated.placa,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { placa: atual.placa, status: atual.status },
      depois: input as Record<string, unknown>,
    });
    return rowParaVeiculo(updated);
  }

  async setStatus(
    scope: AccessScope,
    req: Request,
    autorId: string,
    id: string,
    status: 'EM_MANUTENCAO' | 'ATIVO',
  ) {
    const atual = await prisma.veiculoTFD.findUnique({ where: { id } });
    if (!atual || atual.deletadoEm) throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    const updated = await prisma.veiculoTFD.update({ where: { id }, data: { status } });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: status === 'EM_MANUTENCAO' ? 'VEICULO_MANUTENCAO' : 'VEICULO_REATIVADO',
      recursoTipo: 'VEICULO',
      recursoId: id,
      recursoProtocolo: updated.placa,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { status: atual.status },
      depois: { status: updated.status },
    });
    return rowParaVeiculo(updated);
  }

  async deletar(scope: AccessScope, req: Request, autorId: string, id: string) {
    const atual = await prisma.veiculoTFD.findUnique({ where: { id } });
    if (!atual || atual.deletadoEm) throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    // Bloqueia se há viagem agendada/em andamento
    const ativas = await prisma.viagemFrota.count({
      where: { veiculoId: id, status: { in: ['AGENDADA', 'EM_ANDAMENTO'] } },
    });
    if (ativas > 0) {
      throw Conflict(
        'VEICULO_EM_USO',
        'Veículo possui viagens AGENDADA/EM_ANDAMENTO; conclua/cancele antes',
      );
    }

    await prisma.veiculoTFD.update({
      where: { id },
      data: { deletadoEm: new Date() },
    });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'VEICULO_DELETADO',
      recursoTipo: 'VEICULO',
      recursoId: id,
      recursoProtocolo: atual.placa,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { placa: atual.placa, modelo: atual.modelo },
    });
  }
}
