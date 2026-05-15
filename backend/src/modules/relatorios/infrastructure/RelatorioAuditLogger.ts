/**
 * Auditoria imutável de relatórios (retenção ≥ 5 anos · LGPD art. 37).
 * Nunca apagar registros desta tabela.
 */
import type { Prisma, AcaoAuditRelatorio } from '../../../../generated/prisma';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../infrastructure/logger';

export interface AuditEntry {
  relatorioId: string;
  atendenteId: string;
  acao: AcaoAuditRelatorio;
  ip?: string | null;
  userAgent?: string | null;
  detalhes?: Record<string, unknown>;
}

export class RelatorioAuditLogger {
  async registrar(entry: AuditEntry): Promise<void> {
    try {
      await prisma.relatorioAudit.create({
        data: {
          relatorioId: entry.relatorioId,
          atendenteId: entry.atendenteId,
          acao: entry.acao,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          detalhes: (entry.detalhes as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch (err) {
      // Falha de audit NUNCA quebra o fluxo principal
      logger.error({ err, entry: { acao: entry.acao } }, 'audit de relatório falhou');
    }
  }
}
