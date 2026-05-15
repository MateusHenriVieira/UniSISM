/**
 * Audit logger persistente — grava em AuditoriaLog (Prisma).
 *
 * Uso:
 *   await audit.registrar({
 *     acao: 'APROVAR_ENCAMINHAMENTO',
 *     atendenteId: ctx.sub,
 *     recurso: 'Encaminhamento',
 *     recursoId: enc.id,
 *     payload: { statusAntes, statusDepois, nota, ... },
 *     ip: req.ip,
 *     userAgent: req.header('user-agent'),
 *   });
 *
 * PII sensível deve ser mascarada antes de passar em `payload`.
 */
import type { Prisma } from '../../../generated/prisma';
import { prisma } from '../database/prisma';
import { logger } from '../logger';

export interface AuditEntry {
  acao: string;
  recurso?: string;
  recursoId?: string;
  atendenteId?: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export interface IAuditLogger {
  registrar(entry: AuditEntry): Promise<void>;
}

/** Mascara valores sensíveis antes de gravar em payload JSON. */
function mascararPII(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const low = k.toLowerCase();
    if (
      low === 'senha' ||
      low === 'senhaatual' ||
      low === 'novasenha' ||
      low === 'password' ||
      low === 'token' ||
      low === 'refreshtoken' ||
      low === 'resettoken'
    ) {
      out[k] = '[REDACTED]';
    } else if (low === 'cpf' && typeof v === 'string') {
      out[k] = v.replace(/(\d{3}\.\d{3}\.)\d{3}(-\d{2})/, '$1***$2');
    } else if (low === 'cartaosus' && typeof v === 'string') {
      out[k] = v.replace(/(\d{3}\s\d{4}\s)\d{4}(\s\d{4})/, '$1****$2');
    } else {
      out[k] = v;
    }
  }
  return out;
}

export class PrismaAuditLogger implements IAuditLogger {
  async registrar(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditoriaLog.create({
        data: {
          acao: entry.acao,
          recurso: entry.recurso ?? 'sistema',
          recursoId: entry.recursoId ?? null,
          atendenteId: entry.atendenteId ?? null,
          payload: (mascararPII(entry.payload) as Prisma.InputJsonValue) ?? undefined,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // Falha em audit NUNCA deve quebrar o fluxo principal.
      logger.error({ err, entry: { acao: entry.acao, recurso: entry.recurso } }, 'audit log falhou');
    }
  }
}

export class NoopAuditLogger implements IAuditLogger {
  async registrar(): Promise<void> {}
}
