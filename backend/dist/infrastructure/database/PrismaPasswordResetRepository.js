"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPasswordResetRepository = void 0;
const prisma_1 = require("./prisma");
class PrismaPasswordResetRepository {
    async criar(input) {
        // invalida códigos vigentes anteriores
        await prisma_1.prisma.passwordResetCode.updateMany({
            where: { atendenteId: input.atendenteId, consumidoEm: null },
            data: { consumidoEm: new Date() },
        });
        const r = await prisma_1.prisma.passwordResetCode.create({
            data: {
                atendenteId: input.atendenteId,
                codigoHash: input.codigoHash,
                expiraEm: input.expiraEm,
            },
        });
        return { id: r.id };
    }
    async buscarVigentePorAtendente(atendenteId) {
        const r = await prisma_1.prisma.passwordResetCode.findFirst({
            where: { atendenteId, consumidoEm: null, expiraEm: { gt: new Date() } },
            orderBy: { criadoEm: 'desc' },
        });
        if (!r)
            return null;
        return {
            id: r.id,
            codigoHash: r.codigoHash,
            tentativas: r.tentativas,
            expiraEm: r.expiraEm,
        };
    }
    async incrementarTentativas(id) {
        await prisma_1.prisma.passwordResetCode.update({
            where: { id },
            data: { tentativas: { increment: 1 } },
        });
    }
    async vincularResetToken(id, resetToken) {
        await prisma_1.prisma.passwordResetCode.update({ where: { id }, data: { resetToken } });
    }
    async buscarPorResetToken(token) {
        const r = await prisma_1.prisma.passwordResetCode.findUnique({ where: { resetToken: token } });
        if (!r)
            return null;
        return {
            id: r.id,
            atendenteId: r.atendenteId,
            expiraEm: r.expiraEm,
            consumidoEm: r.consumidoEm,
        };
    }
    async consumir(id) {
        await prisma_1.prisma.passwordResetCode.update({
            where: { id },
            data: { consumidoEm: new Date() },
        });
    }
    async solicitacoesRecentes(atendenteId, janelaSegundos) {
        const desde = new Date(Date.now() - janelaSegundos * 1000);
        return prisma_1.prisma.passwordResetCode.count({
            where: { atendenteId, criadoEm: { gte: desde } },
        });
    }
}
exports.PrismaPasswordResetRepository = PrismaPasswordResetRepository;
//# sourceMappingURL=PrismaPasswordResetRepository.js.map