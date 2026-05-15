/**
 * CRUD de medicamentos em uso. Toggleáveis via `ativo` (suspender/reativar).
 */
import { NotFound } from '../../../shared/errors';
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

export interface AddMedicamentoInput {
  nome: string;
  dosagem: string;
  frequencia: string;
  desde: string; // YYYY-MM-DD
  prescritor: string;
}

export interface UpdateMedicamentoInput {
  ativo?: boolean;
  dosagem?: string;
  frequencia?: string;
  prescritor?: string;
}

export class AddMedicamentoUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    input: AddMedicamentoInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);
    const desde = parseYmdObrigatorio(input.desde, 'DESDE_INVALIDO', 'desde');

    const novo = await prisma.medicamentoEmUso.create({
      data: {
        pacienteId,
        nome: input.nome.trim(),
        dosagem: input.dosagem.trim(),
        frequencia: input.frequencia.trim(),
        desde,
        prescritor: input.prescritor.trim(),
        ativo: true,
      },
      select: { id: true },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'ADD_MEDICAMENTO',
      recursoId: novo.id,
      dados: { ...input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class UpdateMedicamentoUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    medicamentoId: string,
    input: UpdateMedicamentoInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.medicamentoEmUso.findUnique({ where: { id: medicamentoId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('MEDICAMENTO_NAO_ENCONTRADO', 'Medicamento não encontrado');
    }

    const data: Record<string, unknown> = {};
    if (input.ativo !== undefined) data['ativo'] = input.ativo;
    if (input.dosagem !== undefined) data['dosagem'] = input.dosagem.trim();
    if (input.frequencia !== undefined) data['frequencia'] = input.frequencia.trim();
    if (input.prescritor !== undefined) data['prescritor'] = input.prescritor.trim();

    await prisma.medicamentoEmUso.update({ where: { id: medicamentoId }, data });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'UPDATE_MEDICAMENTO',
      recursoId: medicamentoId,
      dados: {
        antes: { ativo: atual.ativo, dosagem: atual.dosagem, frequencia: atual.frequencia },
        depois: input,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class RemoveMedicamentoUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    medicamentoId: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.medicamentoEmUso.findUnique({ where: { id: medicamentoId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('MEDICAMENTO_NAO_ENCONTRADO', 'Medicamento não encontrado');
    }

    await prisma.medicamentoEmUso.delete({ where: { id: medicamentoId } });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'REMOVE_MEDICAMENTO',
      recursoId: medicamentoId,
      dados: {
        nome: atual.nome,
        dosagem: atual.dosagem,
        frequencia: atual.frequencia,
        desde: atual.desde.toISOString(),
        prescritor: atual.prescritor,
        ativo: atual.ativo,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
