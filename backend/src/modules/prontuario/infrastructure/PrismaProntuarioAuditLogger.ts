/**
 * Auditoria persistente de todas as operações sobre o prontuário.
 * Append-only: nunca deletar. Retenção mínima 20 anos (Res. CFM 1.821/2007).
 */
import type { Prisma, AcaoProntuario } from '../../../../generated/prisma';
import { prisma } from '../../../infrastructure/database/prisma';

export interface RegistrarProntuarioInput {
  pacienteId: string;
  autorId: string;
  autorNome: string;
  autorPapel: string;
  acao: AcaoProntuario;
  recursoId?: string;
  dados: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export interface IProntuarioAuditLogger {
  registrar(input: RegistrarProntuarioInput): Promise<void>;
  registrarNaTransacao(tx: Prisma.TransactionClient, input: RegistrarProntuarioInput): Promise<void>;
}

export class PrismaProntuarioAuditLogger implements IProntuarioAuditLogger {
  async registrar(input: RegistrarProntuarioInput): Promise<void> {
    await prisma.pacienteProntuarioAudit.create({
      data: {
        pacienteId: input.pacienteId,
        autorId: input.autorId,
        autorNome: input.autorNome,
        autorPapel: input.autorPapel,
        acao: input.acao,
        recursoId: input.recursoId ?? null,
        dados: input.dados as Prisma.InputJsonValue,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async registrarNaTransacao(
    tx: Prisma.TransactionClient,
    input: RegistrarProntuarioInput,
  ): Promise<void> {
    await tx.pacienteProntuarioAudit.create({
      data: {
        pacienteId: input.pacienteId,
        autorId: input.autorId,
        autorNome: input.autorNome,
        autorPapel: input.autorPapel,
        acao: input.acao,
        recursoId: input.recursoId ?? null,
        dados: input.dados as Prisma.InputJsonValue,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}
