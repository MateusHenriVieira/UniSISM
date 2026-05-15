/**
 * Caderneta de vacinação — registro oficial de doses aplicadas.
 */
import { Conflict, NotFound, Unprocessable } from '../../../shared/errors';
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

export type ViaAplicacaoVacina = 'INTRAMUSCULAR' | 'SUBCUTANEA' | 'ORAL' | 'INTRADERMICA';

export interface AddVacinaInput {
  data: string; // ISO
  vacina: string;
  dose: string;
  lote: string;
  aplicador: string;
  unidade: string;
  via: ViaAplicacaoVacina;
}

export class AddVacinaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    input: AddVacinaInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);
    const data = parseYmdObrigatorio(input.data, 'DATA_INVALIDA', 'data');

    // Spec §8.1: data não pode ser futura
    const hojeUTC = new Date();
    hojeUTC.setUTCHours(23, 59, 59, 999);
    if (data.getTime() > hojeUTC.getTime()) {
      throw Unprocessable('DATA_INVALIDA', 'Data da aplicação não pode ser futura');
    }

    const vacina = input.vacina.trim();
    const dose = input.dose.trim();
    const lote = input.lote.trim();

    // Spec §8.1: unique (pacienteId, vacina, dose, lote) — antifraude/dupla aplicação
    const dup = await prisma.vacinaAplicada.findFirst({
      where: {
        pacienteId,
        vacina: { equals: vacina, mode: 'insensitive' },
        dose: { equals: dose, mode: 'insensitive' },
        lote,
      },
      select: { id: true },
    });
    if (dup) {
      throw Conflict(
        'VACINA_DUPLICADA',
        `Já existe registro desta vacina (${vacina} · ${dose} · lote ${lote}) para este paciente`,
        { vacinaExistenteId: dup.id, vacina, dose, lote },
      );
    }

    const novo = await prisma.vacinaAplicada.create({
      data: {
        pacienteId,
        data,
        vacina,
        dose,
        lote,
        aplicador: input.aplicador.trim(),
        unidade: input.unidade.trim(),
        via: input.via,
      },
      select: { id: true },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'ADD_VACINA',
      recursoId: novo.id,
      dados: { ...input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class RemoveVacinaUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    vacinaId: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.vacinaAplicada.findUnique({ where: { id: vacinaId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('VACINA_NAO_ENCONTRADA', 'Registro de vacinação não encontrado');
    }

    await prisma.vacinaAplicada.delete({ where: { id: vacinaId } });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'REMOVE_VACINA',
      recursoId: vacinaId,
      dados: {
        data: atual.data.toISOString(),
        vacina: atual.vacina,
        dose: atual.dose,
        lote: atual.lote,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
