/**
 * Exclusão (soft delete) de paciente.
 *
 * Permissões:
 *   - DESENVOLVEDOR: qualquer paciente.
 *   - ADMIN: pacientes da sua prefeitura.
 *   - COORDENADOR_UBS: pacientes da sua UBS (para casos de duplicidade/óbito).
 *
 * Bloqueia se houver encaminhamentos ativos (AGUARDANDO_REGULACAO ou PENDENCIA_DOCUMENTO).
 */
import { Conflict, Forbidden, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import type { AccessScope } from '../../shared/scope';
import type { IAuditLogger } from '../../infrastructure/audit/PrismaAuditLogger';

export class DeletePacienteUseCase {
  constructor(private readonly audit?: IAuditLogger) {}

  async exec(scope: AccessScope, editorId: string, pacienteId: string): Promise<void> {
    const alvo = await prisma.paciente.findUnique({
      where: { id: pacienteId },
      include: { ubs: { select: { prefeituraId: true } } },
    });
    if (!alvo || alvo.deletadoEm) {
      throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
    }

    if (scope.kind === 'UBS' && scope.ubsId !== alvo.ubsId) {
      throw Forbidden('FORA_DO_ESCOPO', 'Paciente fora do escopo da UBS');
    }
    if (scope.kind === 'PREFEITURA' && scope.prefeituraId !== alvo.ubs.prefeituraId) {
      throw Forbidden('FORA_DO_ESCOPO', 'Paciente fora do escopo da prefeitura');
    }

    const encsAtivos = await prisma.encaminhamento.count({
      where: {
        pacienteId,
        status: { in: ['AGUARDANDO_REGULACAO', 'PENDENCIA_DOCUMENTO'] },
        deletadoEm: null,
      },
    });
    if (encsAtivos > 0) {
      throw Conflict(
        'PACIENTE_COM_ENCAMINHAMENTOS_ATIVOS',
        'Resolva ou rejeite os encaminhamentos ativos antes de excluir o paciente.',
        { encsAtivos },
      );
    }

    await prisma.paciente.update({
      where: { id: pacienteId },
      data: { deletadoEm: new Date() },
    });

    await this.audit?.registrar({
      acao: 'EXCLUIR_PACIENTE',
      recurso: 'Paciente',
      recursoId: pacienteId,
      atendenteId: editorId,
      payload: {
        nome: alvo.nome,
        cpf: alvo.cpf,
        ubsId: alvo.ubsId,
        prefeituraId: alvo.ubs.prefeituraId,
      },
    });
  }
}
