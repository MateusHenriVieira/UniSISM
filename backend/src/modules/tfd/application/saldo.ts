/**
 * Saldo orçamentário mensal por veículo (combustível).
 *
 * - `listar` retorna registros do mês (cria placeholder zero pra todo veículo ativo).
 * - `ajustar` SOBRESCREVE o saldoMensal — restrito a ADMIN/DEV.
 * - `aportar` SOMA ao saldoMensal — restrito a quem pode gerenciar TFD.
 *   Suporta `rateioGeral=true` (divide o valor entre veículos ATIVO).
 * - `listarAportes` lê o histórico do mês.
 *
 * Toda operação grava auditoria + a transação faz upsert atômico em SaldoVeiculo.
 */
import crypto from 'node:crypto';
import type { Request } from 'express';
import { Forbidden, NotFound, Unprocessable } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { Prisma, FonteRecursoTFD } from '../../../../generated/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { ITfdAuditLogger } from '../infrastructure/TfdAuditLogger';
import {
  assertMesmaPrefeitura,
  ctxAudit,
  mesAtualYmd,
  resolverOperador,
  resolverPrefeituraIdEfetiva,
} from './_helpers';

export interface AjustarSaldoInput {
  veiculoId: string;
  mes: string; // YYYY-MM
  novoSaldoMensal: number;
  justificativa: string;
}

export interface AporteSaldoFrotaInput {
  veiculoId?: string;
  rateioGeral?: boolean;
  mes: string;
  valorBRL: number;
  fonte: FonteRecursoTFD;
  numeroDocumento?: string;
  descricaoFonte?: string;
  justificativa: string;
}

const FONTES_REQUER_DOC = new Set<FonteRecursoTFD>(['EMPENHO', 'PORTARIA']);

function rowParaSaldo(s: any, veiculo?: any) {
  const mensal = Number(s.saldoMensal);
  const consumido = Number(s.saldoConsumido);
  const reservado = Number(s.saldoReservado);
  return {
    veiculoId: s.veiculoId,
    veiculoPlaca: veiculo?.placa ?? null,
    veiculoModelo: veiculo?.modelo ?? null,
    mes: s.mes,
    saldoMensal: mensal,
    saldoConsumido: consumido,
    saldoReservado: reservado,
    saldoDisponivel: +(mensal - consumido - reservado).toFixed(2),
    prefeituraId: s.prefeituraId,
  };
}

function rowParaAporte(a: any, veiculo?: { placa: string; modelo: string } | null) {
  return {
    id: a.id,
    veiculoId: a.veiculoId,
    veiculoPlaca: veiculo?.placa ?? null,
    veiculoModelo: veiculo?.modelo ?? null,
    rateioGeral: a.rateioGeral,
    grupoRateioId: a.grupoRateioId,
    mes: a.mes,
    valorBRL: Number(a.valorBRL),
    fonte: a.fonte,
    numeroDocumento: a.numeroDocumento,
    descricaoFonte: a.descricaoFonte,
    justificativa: a.justificativa,
    operadorId: a.operadorId,
    criadoEm: a.criadoEm.toISOString(),
    prefeituraId: a.prefeituraId,
  };
}

function validarFonte(input: AporteSaldoFrotaInput): void {
  if (FONTES_REQUER_DOC.has(input.fonte) && !input.numeroDocumento?.trim()) {
    throw Unprocessable(
      'APORTE_DOCUMENTO_OBRIGATORIO',
      `Fonte ${input.fonte} exige numeroDocumento (ex.: empenho, portaria)`,
    );
  }
  if (input.fonte === 'OUTRO' && !input.descricaoFonte?.trim()) {
    throw Unprocessable(
      'APORTE_FONTE_INVALIDA',
      'Fonte OUTRO exige descricaoFonte',
    );
  }
}

function rateioInteiroEmCentavos(valorBRL: number, n: number): number[] {
  const centavosTotal = Math.round(valorBRL * 100);
  const base = Math.floor(centavosTotal / n);
  const resto = centavosTotal - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? resto : 0));
}

export class SaldoUseCases {
  constructor(
    private readonly audit: ITfdAuditLogger,
    private readonly atendentes: IAtendenteRepository,
  ) {}

  async listar(scope: AccessScope, req: Request, mes?: string) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const mesEfetivo = mes ?? mesAtualYmd();

    const veiculos = await prisma.veiculoTFD.findMany({
      where: { prefeituraId, deletadoEm: null },
      select: { id: true, placa: true, modelo: true },
    });

    const saldos = await prisma.saldoVeiculo.findMany({
      where: { prefeituraId, mes: mesEfetivo },
    });
    const map = new Map(saldos.map((s) => [s.veiculoId, s]));

    return veiculos.map((v) => {
      const s = map.get(v.id) ?? {
        veiculoId: v.id,
        prefeituraId,
        mes: mesEfetivo,
        saldoMensal: 0,
        saldoConsumido: 0,
        saldoReservado: 0,
      };
      return rowParaSaldo(s, v);
    });
  }

  async ajustar(scope: AccessScope, req: Request, autorId: string, input: AjustarSaldoInput) {
    if (input.justificativa.trim().length < 10) {
      throw Unprocessable('JUSTIFICATIVA_OBRIGATORIA', 'Justificativa deve ter ≥ 10 caracteres');
    }
    if (input.novoSaldoMensal < 0) {
      throw Unprocessable('SALDO_NEGATIVO', 'Saldo mensal não pode ser negativo');
    }
    // Apenas ADMIN/DEV
    if (scope.kind === 'UBS') {
      throw Forbidden('ROLE_NAO_PERMITIDO', 'Apenas ADMIN/DEV podem ajustar saldo');
    }

    const veiculo = await prisma.veiculoTFD.findUnique({ where: { id: input.veiculoId } });
    if (!veiculo || veiculo.deletadoEm) {
      throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    }
    assertMesmaPrefeitura(scope, veiculo.prefeituraId);
    const op = await resolverOperador(this.atendentes, autorId, veiculo.prefeituraId);

    const atual = await prisma.saldoVeiculo.findUnique({
      where: { veiculoId_mes: { veiculoId: input.veiculoId, mes: input.mes } },
    });
    const saldoAnterior = atual ? Number(atual.saldoMensal) : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.saldoVeiculo.upsert({
        where: { veiculoId_mes: { veiculoId: input.veiculoId, mes: input.mes } },
        update: { saldoMensal: input.novoSaldoMensal },
        create: {
          veiculoId: input.veiculoId,
          prefeituraId: veiculo.prefeituraId,
          mes: input.mes,
          saldoMensal: input.novoSaldoMensal,
        },
      });
      await tx.saldoAjuste.create({
        data: {
          veiculoId: input.veiculoId,
          prefeituraId: veiculo.prefeituraId,
          mes: input.mes,
          saldoAnterior,
          saldoNovo: input.novoSaldoMensal,
          justificativa: input.justificativa.trim(),
          ajustadoPorId: autorId,
        },
      });
      return s;
    });

    await this.audit.registrar({
      prefeituraId: veiculo.prefeituraId,
      acao: 'SALDO_AJUSTADO',
      recursoTipo: 'SALDO_VEICULO',
      recursoId: `${input.veiculoId}:${input.mes}`,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { saldoMensal: saldoAnterior },
      depois: {
        saldoMensal: input.novoSaldoMensal,
        justificativa: input.justificativa,
      },
    });
    return rowParaSaldo(updated, veiculo);
  }

  async aportar(scope: AccessScope, req: Request, autorId: string, input: AporteSaldoFrotaInput) {
    if (input.justificativa.trim().length < 10) {
      throw Unprocessable('JUSTIFICATIVA_OBRIGATORIA', 'Justificativa deve ter ≥ 10 caracteres');
    }
    if (!Number.isFinite(input.valorBRL) || input.valorBRL <= 0) {
      throw Unprocessable('APORTE_INVALIDO', 'valorBRL deve ser > 0');
    }
    if (!/^\d{4}-\d{2}$/.test(input.mes)) {
      throw Unprocessable('DATA_INVALIDA', 'mes deve estar em YYYY-MM');
    }
    validarFonte(input);

    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const op = await resolverOperador(this.atendentes, autorId, prefeituraId);

    // Modo rateio: divide entre veículos ATIVO
    if (input.rateioGeral) {
      if (input.veiculoId) {
        throw Unprocessable(
          'APORTE_INVALIDO',
          'Em rateioGeral=true, omita veiculoId',
        );
      }
      const veiculos = await prisma.veiculoTFD.findMany({
        where: { prefeituraId, deletadoEm: null, status: 'ATIVO' },
        select: { id: true, placa: true, modelo: true },
        orderBy: { placa: 'asc' },
      });
      if (veiculos.length === 0) {
        throw Unprocessable(
          'APORTE_INVALIDO',
          'Nenhum veículo ATIVO para receber rateio',
        );
      }
      const partes = rateioInteiroEmCentavos(input.valorBRL, veiculos.length);
      const grupoRateioId = crypto.randomUUID();

      const aportes = await prisma.$transaction(async (tx) => {
        const out: Array<{ aporte: any; veiculo: typeof veiculos[number]; valor: number }> = [];
        for (let i = 0; i < veiculos.length; i++) {
          const v = veiculos[i]!;
          const valor = partes[i]! / 100;
          await tx.saldoVeiculo.upsert({
            where: { veiculoId_mes: { veiculoId: v.id, mes: input.mes } },
            update: { saldoMensal: { increment: valor } },
            create: {
              veiculoId: v.id,
              prefeituraId,
              mes: input.mes,
              saldoMensal: valor,
            },
          });
          const aporte = await tx.aporteSaldoFrota.create({
            data: {
              prefeituraId,
              veiculoId: v.id,
              rateioGeral: true,
              grupoRateioId,
              mes: input.mes,
              valorBRL: valor,
              fonte: input.fonte,
              numeroDocumento: input.numeroDocumento ?? null,
              descricaoFonte: input.descricaoFonte ?? null,
              justificativa: input.justificativa.trim(),
              operadorId: autorId,
            },
          });
          out.push({ aporte, veiculo: v, valor });
        }
        return out;
      });

      await this.audit.registrar({
        prefeituraId,
        acao: 'SALDO_APORTADO',
        recursoTipo: 'SALDO_VEICULO',
        recursoId: grupoRateioId,
        operadorId: op.id,
        operadorNome: op.nome,
        operadorMatricula: op.matricula,
        operadorRole: op.role,
        ...ctxAudit(req),
        depois: {
          rateioGeral: true,
          mes: input.mes,
          valorBRL: input.valorBRL,
          veiculosBeneficiados: veiculos.length,
          fonte: input.fonte,
          numeroDocumento: input.numeroDocumento ?? null,
          justificativa: input.justificativa,
        },
      });
      return {
        modo: 'rateio' as const,
        grupoRateioId,
        mes: input.mes,
        valorTotalBRL: input.valorBRL,
        aportes: aportes.map(({ aporte, veiculo }) => rowParaAporte(aporte, veiculo)),
      };
    }

    // Modo veículo único
    if (!input.veiculoId) {
      throw Unprocessable(
        'APORTE_INVALIDO',
        'Informe veiculoId ou use rateioGeral=true',
      );
    }
    const veiculo = await prisma.veiculoTFD.findUnique({
      where: { id: input.veiculoId },
      select: { id: true, prefeituraId: true, deletadoEm: true, placa: true, modelo: true },
    });
    if (!veiculo || veiculo.deletadoEm) {
      throw NotFound('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado');
    }
    assertMesmaPrefeitura(scope, veiculo.prefeituraId);

    const saldoAnterior = await prisma.saldoVeiculo.findUnique({
      where: { veiculoId_mes: { veiculoId: input.veiculoId, mes: input.mes } },
      select: { saldoMensal: true },
    });
    const mensalAntes = saldoAnterior ? Number(saldoAnterior.saldoMensal) : 0;

    const aporte = await prisma.$transaction(async (tx) => {
      await tx.saldoVeiculo.upsert({
        where: { veiculoId_mes: { veiculoId: input.veiculoId!, mes: input.mes } },
        update: { saldoMensal: { increment: input.valorBRL } },
        create: {
          veiculoId: input.veiculoId!,
          prefeituraId,
          mes: input.mes,
          saldoMensal: input.valorBRL,
        },
      });
      return tx.aporteSaldoFrota.create({
        data: {
          prefeituraId,
          veiculoId: input.veiculoId!,
          rateioGeral: false,
          mes: input.mes,
          valorBRL: input.valorBRL,
          fonte: input.fonte,
          numeroDocumento: input.numeroDocumento ?? null,
          descricaoFonte: input.descricaoFonte ?? null,
          justificativa: input.justificativa.trim(),
          operadorId: autorId,
        },
      });
    });

    await this.audit.registrar({
      prefeituraId,
      acao: 'SALDO_APORTADO',
      recursoTipo: 'SALDO_VEICULO',
      recursoId: `${input.veiculoId}:${input.mes}`,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { saldoMensal: mensalAntes },
      depois: {
        saldoMensal: +(mensalAntes + input.valorBRL).toFixed(2),
        valorBRL: input.valorBRL,
        fonte: input.fonte,
        numeroDocumento: input.numeroDocumento ?? null,
        justificativa: input.justificativa,
      },
    });
    return {
      modo: 'unico' as const,
      mes: input.mes,
      valorTotalBRL: input.valorBRL,
      aportes: [rowParaAporte(aporte, veiculo)],
    };
  }

  async listarAportes(scope: AccessScope, req: Request, filtros: { mes?: string; veiculoId?: string }) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const where: Prisma.AporteSaldoFrotaWhereInput = { prefeituraId };
    if (filtros.mes) where.mes = filtros.mes;
    if (filtros.veiculoId) where.veiculoId = filtros.veiculoId;
    const aportes = await prisma.aporteSaldoFrota.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 500,
    });
    const veiculoIds = Array.from(
      new Set(aportes.map((a) => a.veiculoId).filter((id): id is string => !!id)),
    );
    const veiculos = await prisma.veiculoTFD.findMany({
      where: { id: { in: veiculoIds } },
      select: { id: true, placa: true, modelo: true },
    });
    const mapV = new Map(veiculos.map((v) => [v.id, v]));
    return aportes.map((a) => rowParaAporte(a, a.veiculoId ? mapV.get(a.veiculoId) ?? null : null));
  }
}
