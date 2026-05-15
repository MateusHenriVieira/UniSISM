/**
 * Exclusão (soft delete) de prefeitura.
 *
 * Esta é uma operação MUITO destrutiva — apenas `DESENVOLVEDOR` pode executar.
 * Todos os usuários, UBSs, pacientes e encaminhamentos da prefeitura ficam
 * inacessíveis, mas permanecem no banco para retenção LGPD / auditoria.
 */
import { Conflict, Forbidden, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import type { AccessScope } from '../../shared/scope';
import type { IAuditLogger } from '../../infrastructure/audit/PrismaAuditLogger';

export class DeletePrefeituraUseCase {
  constructor(private readonly audit?: IAuditLogger) {}

  async exec(scope: AccessScope, editorId: string, alvoId: string): Promise<void> {
    if (scope.kind !== 'GLOBAL') {
      throw Forbidden(
        'PERMISSAO_INSUFICIENTE',
        'Apenas DESENVOLVEDOR pode excluir uma prefeitura',
      );
    }

    const alvo = await prisma.prefeitura.findUnique({ where: { id: alvoId } });
    if (!alvo || alvo.deletadoEm) {
      throw NotFound('PREFEITURA_NAO_ENCONTRADA', 'Prefeitura não encontrada');
    }

    // Proteção extra: checar dependências ativas
    const [ubsAtivas, atendentesAtivos] = await Promise.all([
      prisma.ubs.count({ where: { prefeituraId: alvoId, deletadoEm: null } }),
      prisma.atendente.count({ where: { prefeituraId: alvoId, deletadoEm: null } }),
    ]);
    if (ubsAtivas > 0 || atendentesAtivos > 0) {
      throw Conflict(
        'PREFEITURA_COM_DEPENDENCIAS',
        `Desative/remova UBSs e usuários antes de excluir a prefeitura.`,
        { ubsAtivas, atendentesAtivos },
      );
    }

    await prisma.prefeitura.update({
      where: { id: alvoId },
      data: { ativa: false, deletadoEm: new Date() },
    });

    await this.audit?.registrar({
      acao: 'EXCLUIR_PREFEITURA',
      recurso: 'Prefeitura',
      recursoId: alvoId,
      atendenteId: editorId,
      payload: { nome: alvo.nome, cnpj: alvo.cnpj },
    });
  }
}
