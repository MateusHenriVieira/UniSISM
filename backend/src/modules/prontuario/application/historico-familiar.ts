/**
 * Histórico familiar — lista de strings livres (ex.: "Mãe hipertensa", "Pai diabético").
 * Substituição total (PUT): frontend envia a lista nova; backend grava.
 */
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { PacienteCompleto } from '../../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IProntuarioAuditLogger } from '../infrastructure/PrismaProntuarioAuditLogger';
import { assertAcessoPaciente, carregarCompleto, resolverAutor } from './_helpers';

export class SetHistoricoFamiliarUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    itens: string[],
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    // Normaliza: trim + remove vazios + remove duplicatas
    const limpo = Array.from(
      new Set(itens.map((s) => s.trim()).filter((s) => s.length > 0)),
    );

    const atual = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { historicoFamiliar: true },
    });

    await prisma.paciente.update({
      where: { id: pacienteId },
      data: { historicoFamiliar: limpo },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'SET_HISTORICO_FAMILIAR',
      recursoId: pacienteId,
      dados: { antes: atual?.historicoFamiliar ?? [], depois: limpo },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
