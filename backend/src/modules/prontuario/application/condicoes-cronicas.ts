/**
 * CRUD de condições crônicas — hipertensão, diabetes, etc. Toggleáveis via `ativo`.
 */
import { Conflict, NotFound } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { PacienteCompleto } from '../../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IProntuarioAuditLogger } from '../infrastructure/PrismaProntuarioAuditLogger';
import {
  assertAcessoPaciente,
  carregarCompleto,
  parseYmdObrigatorio,
  resolverAutor,
} from './_helpers';

export interface AddCondicaoCronicaInput {
  cid10: string;
  descricao: string;
  desde: string; // YYYY-MM-DD
  observacao?: string;
}

export interface UpdateCondicaoCronicaInput {
  descricao?: string;
  ativo?: boolean;
  observacao?: string | null;
}

export class AddCondicaoCronicaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    input: AddCondicaoCronicaInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);
    const desde = parseYmdObrigatorio(input.desde, 'DESDE_INVALIDO', 'desde');
    const cid = input.cid10.trim().toUpperCase();

    // Proíbe condições ATIVAS duplicadas pro mesmo CID
    const dup = await prisma.condicaoCronica.findFirst({
      where: { pacienteId, cid10: cid, ativo: true },
      select: { id: true },
    });
    if (dup) {
      throw Conflict(
        'ITEM_DUPLICADO',
        `Já existe uma condição crônica ATIVA com CID ${cid} pra este paciente`,
      );
    }

    const novo = await prisma.condicaoCronica.create({
      data: {
        pacienteId,
        cid10: cid,
        descricao: input.descricao.trim(),
        desde,
        ativo: true,
        observacao: input.observacao?.trim() || null,
      },
      select: { id: true },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'ADD_CONDICAO_CRONICA',
      recursoId: novo.id,
      dados: { ...input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class UpdateCondicaoCronicaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    condicaoId: string,
    input: UpdateCondicaoCronicaInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.condicaoCronica.findUnique({ where: { id: condicaoId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('CONDICAO_NAO_ENCONTRADA', 'Condição crônica não encontrada');
    }

    const data: Record<string, unknown> = {};
    if (input.descricao !== undefined) data['descricao'] = input.descricao.trim();
    if (input.ativo !== undefined) data['ativo'] = input.ativo;
    if (input.observacao !== undefined) data['observacao'] = input.observacao?.trim() || null;

    await prisma.condicaoCronica.update({ where: { id: condicaoId }, data });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'UPDATE_CONDICAO_CRONICA',
      recursoId: condicaoId,
      dados: { antes: { ativo: atual.ativo, observacao: atual.observacao }, depois: input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class RemoveCondicaoCronicaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    condicaoId: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.condicaoCronica.findUnique({ where: { id: condicaoId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('CONDICAO_NAO_ENCONTRADA', 'Condição crônica não encontrada');
    }

    await prisma.condicaoCronica.delete({ where: { id: condicaoId } });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'REMOVE_CONDICAO_CRONICA',
      recursoId: condicaoId,
      dados: {
        cid10: atual.cid10,
        descricao: atual.descricao,
        desde: atual.desde.toISOString(),
        ativo: atual.ativo,
        observacao: atual.observacao,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
