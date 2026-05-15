/**
 * CRUD de alergias — sub-documento do prontuário.
 * Não há UPDATE: alergia é fato clínico. Se errou, deleta e recria.
 */
import { Conflict, NotFound } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { PacienteCompleto } from '../../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IProntuarioAuditLogger } from '../infrastructure/PrismaProntuarioAuditLogger';
import { assertAcessoPaciente, carregarCompleto, resolverAutor } from './_helpers';

export interface AddAlergiaInput {
  substancia: string;
  tipo: 'MEDICAMENTO' | 'ALIMENTO' | 'AMBIENTAL' | 'OUTRO';
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  observacao?: string;
}

export class AddAlergiaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    input: AddAlergiaInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);
    const substancia = input.substancia.trim();

    // Proíbe alergias duplicadas (mesma substância)
    const dup = await prisma.alergia.findFirst({
      where: { pacienteId, substancia: { equals: substancia, mode: 'insensitive' } },
      select: { id: true },
    });
    if (dup) {
      throw Conflict(
        'ITEM_DUPLICADO',
        `Já existe uma alergia a "${substancia}" registrada pra este paciente`,
      );
    }

    const novo = await prisma.alergia.create({
      data: {
        pacienteId,
        substancia,
        tipo: input.tipo,
        gravidade: input.gravidade,
        observacao: input.observacao?.trim() || null,
      },
      select: { id: true },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'ADD_ALERGIA',
      recursoId: novo.id,
      dados: { ...input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class RemoveAlergiaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    alergiaId: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.alergia.findUnique({ where: { id: alergiaId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('ALERGIA_NAO_ENCONTRADA', 'Alergia não encontrada');
    }

    await prisma.alergia.delete({ where: { id: alergiaId } });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'REMOVE_ALERGIA',
      recursoId: alergiaId,
      dados: {
        substancia: atual.substancia,
        tipo: atual.tipo,
        gravidade: atual.gravidade,
        observacao: atual.observacao,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
