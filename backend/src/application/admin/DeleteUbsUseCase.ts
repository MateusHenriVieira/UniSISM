/**
 * Exclusão (soft delete) de UBS.
 * DEV (qualquer) ou ADMIN (mesma prefeitura).
 * Bloqueia quando há encaminhamentos ativos ou atendentes vinculados.
 */
import { Conflict, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import { ensurePrefeituraAcessivel, type AccessScope } from '../../shared/scope';
import type { IAuditLogger } from '../../infrastructure/audit/PrismaAuditLogger';

export class DeleteUbsUseCase {
  constructor(private readonly audit?: IAuditLogger) {}

  async exec(scope: AccessScope, editorId: string, ubsId: string): Promise<void> {
    const alvo = await prisma.ubs.findUnique({ where: { id: ubsId } });
    if (!alvo || alvo.deletadoEm) {
      throw NotFound('UBS_NAO_ENCONTRADA', 'UBS não encontrada');
    }
    ensurePrefeituraAcessivel(scope, alvo.prefeituraId);

    const [atendentesAtivos, encsAtivos] = await Promise.all([
      prisma.atendente.count({
        where: { ubsId, deletadoEm: null, ativo: true },
      }),
      prisma.encaminhamento.count({
        where: {
          ubsId,
          status: { in: ['AGUARDANDO_REGULACAO', 'PENDENCIA_DOCUMENTO'] },
          deletadoEm: null,
        },
      }),
    ]);
    if (atendentesAtivos > 0 || encsAtivos > 0) {
      throw Conflict(
        'UBS_COM_DEPENDENCIAS',
        'Desative/remova atendentes ativos e resolva encaminhamentos pendentes antes de excluir a UBS.',
        { atendentesAtivos, encsAtivos },
      );
    }

    await prisma.ubs.update({
      where: { id: ubsId },
      data: { ativa: false, deletadoEm: new Date() },
    });

    await this.audit?.registrar({
      acao: 'EXCLUIR_UBS',
      recurso: 'Ubs',
      recursoId: ubsId,
      atendenteId: editorId,
      payload: { nome: alvo.nome, cnes: alvo.cnes, prefeituraId: alvo.prefeituraId },
    });
  }
}
