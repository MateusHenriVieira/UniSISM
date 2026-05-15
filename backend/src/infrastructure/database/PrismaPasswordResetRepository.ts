import { prisma } from './prisma';
import type { IPasswordResetRepository } from '../../domain/repositories/IPasswordResetRepository';

export class PrismaPasswordResetRepository implements IPasswordResetRepository {
  async criar(input: {
    atendenteId: string;
    codigoHash: string;
    expiraEm: Date;
  }): Promise<{ id: string }> {
    // invalida códigos vigentes anteriores
    await prisma.passwordResetCode.updateMany({
      where: { atendenteId: input.atendenteId, consumidoEm: null },
      data: { consumidoEm: new Date() },
    });
    const r = await prisma.passwordResetCode.create({
      data: {
        atendenteId: input.atendenteId,
        codigoHash: input.codigoHash,
        expiraEm: input.expiraEm,
      },
    });
    return { id: r.id };
  }

  async buscarVigentePorAtendente(atendenteId: string) {
    const r = await prisma.passwordResetCode.findFirst({
      where: { atendenteId, consumidoEm: null, expiraEm: { gt: new Date() } },
      orderBy: { criadoEm: 'desc' },
    });
    if (!r) return null;
    return {
      id: r.id,
      codigoHash: r.codigoHash,
      tentativas: r.tentativas,
      expiraEm: r.expiraEm,
    };
  }

  async incrementarTentativas(id: string): Promise<void> {
    await prisma.passwordResetCode.update({
      where: { id },
      data: { tentativas: { increment: 1 } },
    });
  }

  async vincularResetToken(id: string, resetToken: string): Promise<void> {
    await prisma.passwordResetCode.update({ where: { id }, data: { resetToken } });
  }

  async buscarPorResetToken(token: string) {
    const r = await prisma.passwordResetCode.findUnique({ where: { resetToken: token } });
    if (!r) return null;
    return {
      id: r.id,
      atendenteId: r.atendenteId,
      expiraEm: r.expiraEm,
      consumidoEm: r.consumidoEm,
    };
  }

  async consumir(id: string): Promise<void> {
    await prisma.passwordResetCode.update({
      where: { id },
      data: { consumidoEm: new Date() },
    });
  }

  async solicitacoesRecentes(atendenteId: string, janelaSegundos: number): Promise<number> {
    const desde = new Date(Date.now() - janelaSegundos * 1000);
    return prisma.passwordResetCode.count({
      where: { atendenteId, criadoEm: { gte: desde } },
    });
  }
}
