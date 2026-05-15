"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSessaoRepository = void 0;
const prisma_1 = require("./prisma");
class PrismaSessaoRepository {
    async criar(input) {
        const sessao = await prisma_1.prisma.sessao.create({
            data: {
                atendenteId: input.atendenteId,
                ip: input.ip ?? null,
                userAgent: input.userAgent ?? null,
                dispositivo: input.dispositivo ?? null,
                local: input.local ?? null,
                expiraEm: input.expiraEm,
            },
        });
        const refresh = await prisma_1.prisma.refreshToken.create({
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
    async buscarPorRefreshHash(hash) {
        const r = await prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
        if (!r || r.revogadoEm || r.expiraEm < new Date() || !r.sessaoId)
            return null;
        return { atendenteId: r.atendenteId, sessaoId: r.sessaoId };
    }
    async revogarPorRefreshHash(hash) {
        const r = await prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
        if (!r)
            return;
        await prisma_1.prisma.refreshToken.update({
            where: { id: r.id },
            data: { revogadoEm: new Date() },
        });
        if (r.sessaoId) {
            await prisma_1.prisma.sessao.update({
                where: { id: r.sessaoId },
                data: { revogadaEm: new Date() },
            });
        }
    }
    async revogarOutras(atendenteId, sessaoIdAtual) {
        const result = await prisma_1.prisma.sessao.updateMany({
            where: {
                atendenteId,
                revogadaEm: null,
                id: { not: sessaoIdAtual },
            },
            data: { revogadaEm: new Date() },
        });
        await prisma_1.prisma.refreshToken.updateMany({
            where: {
                atendenteId,
                revogadoEm: null,
                sessaoId: { not: sessaoIdAtual },
            },
            data: { revogadoEm: new Date() },
        });
        return result.count;
    }
    async revogarTodas(atendenteId) {
        await prisma_1.prisma.sessao.updateMany({
            where: { atendenteId, revogadaEm: null },
            data: { revogadaEm: new Date() },
        });
        await prisma_1.prisma.refreshToken.updateMany({
            where: { atendenteId, revogadoEm: null },
            data: { revogadoEm: new Date() },
        });
    }
    async contarAtivas(atendenteId) {
        return prisma_1.prisma.sessao.count({
            where: { atendenteId, revogadaEm: null, expiraEm: { gt: new Date() } },
        });
    }
}
exports.PrismaSessaoRepository = PrismaSessaoRepository;
//# sourceMappingURL=PrismaSessaoRepository.js.map