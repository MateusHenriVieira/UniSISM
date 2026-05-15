import { prisma } from './prisma';
import type {
  CriarSessaoInput,
  ISessaoRepository,
  SessaoRegistrada,
} from '../../domain/repositories/ISessaoRepository';

export class PrismaSessaoRepository implements ISessaoRepository {
  async criar(input: CriarSessaoInput): Promise<SessaoRegistrada> {
    const sessao = await prisma.sessao.create({
      data: {
        atendenteId: input.atendenteId,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        dispositivo: input.dispositivo ?? null,
        local: input.local ?? null,
        expiraEm: input.expiraEm,
      },
    });
    const refresh = await prisma.refreshToken.create({
      data: {
        atendenteId: input.atendenteId,
        tokenHash: input.refreshTokenHash,
        expiraEm: input.expiraEm,
        sessaoId: sessao.id,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
    return { sessaoId: sessao.id, refreshTokenId: refresh.id };
  }

  async buscarPorRefreshHash(
    hash: string,
  ): Promise<{ atendenteId: string; sessaoId: string } | null> {
    const r = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!r || r.revogadoEm || r.expiraEm < new Date() || !r.sessaoId) return null;
    return { atendenteId: r.atendenteId, sessaoId: r.sessaoId };
  }

  async revogarPorRefreshHash(hash: string): Promise<void> {
    const r = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!r) return;
    await prisma.refreshToken.update({
      where: { id: r.id },
      data: { revogadoEm: new Date() },
    });
    if (r.sessaoId) {
      await prisma.sessao.update({
        where: { id: r.sessaoId },
        data: { revogadaEm: new Date() },
      });
    }
  }

  async revogarOutras(atendenteId: string, sessaoIdAtual: string): Promise<number> {
    const result = await prisma.sessao.updateMany({
      where: {
        atendenteId,
        revogadaEm: null,
        id: { not: sessaoIdAtual },
      },
      data: { revogadaEm: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: {
        atendenteId,
        revogadoEm: null,
        sessaoId: { not: sessaoIdAtual },
      },
      data: { revogadoEm: new Date() },
    });
    return result.count;
  }

  async revogarTodas(atendenteId: string): Promise<void> {
    await prisma.sessao.updateMany({
      where: { atendenteId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
    await prisma.refreshToken.updateMany({
      where: { atendenteId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }

  async contarAtivas(atendenteId: string): Promise<number> {
    return prisma.sessao.count({
      where: { atendenteId, revogadaEm: null, expiraEm: { gt: new Date() } },
    });
  }
}
