"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaAtendenteRepository = void 0;
const prisma_1 = require("./prisma");
class PrismaAtendenteRepository {
    async buscarPorLogin(login) {
        const where = login.includes('@')
            ? { email: login.toLowerCase() }
            : { matricula: login.toUpperCase() };
        return prisma_1.prisma.atendente.findFirst({ where, include: { ubs: true } });
    }
    async buscarPorId(id) {
        return prisma_1.prisma.atendente.findUnique({ where: { id }, include: { ubs: true } });
    }
    async buscarPorEmail(email) {
        return prisma_1.prisma.atendente.findUnique({
            where: { email: email.toLowerCase() },
            include: { ubs: true },
        });
    }
    async atualizarSenha(id, senhaHash) {
        await prisma_1.prisma.atendente.update({
            where: { id },
            data: { senhaHash, senhaAlteradaEm: new Date() },
        });
    }
    async registrarTentativaLogin(params) {
        await prisma_1.prisma.tentativaLogin.create({
            data: {
                login: params.login,
                sucesso: params.sucesso,
                atendenteId: params.atendenteId ?? null,
                ip: params.ip ?? null,
                userAgent: params.userAgent ?? null,
            },
        });
    }
    async contarTentativasFalhas(login, janelaMinutos) {
        const desde = new Date(Date.now() - janelaMinutos * 60_000);
        return prisma_1.prisma.tentativaLogin.count({
            where: {
                login,
                sucesso: false,
                criadoEm: { gte: desde },
            },
        });
    }
    async bloquearAte(id, ate) {
        await prisma_1.prisma.atendente.update({ where: { id }, data: { bloqueadoAte: ate } });
    }
    async registrarAtividade(atendenteId, acao, alvo) {
        await prisma_1.prisma.atividadeAtendente.create({
            data: { atendenteId, acao, alvo: alvo ?? null },
        });
    }
    async atualizarRole(id, role) {
        await prisma_1.prisma.atendente.update({ where: { id }, data: { role } });
    }
}
exports.PrismaAtendenteRepository = PrismaAtendenteRepository;
//# sourceMappingURL=PrismaAtendenteRepository.js.map