"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaRelatorioRepository = void 0;
const prisma_1 = require("../../../generated/prisma");
const prisma_2 = require("./prisma");
function toBR(d) {
    return d.toLocaleDateString('pt-BR');
}
function rowParaDominio(r) {
    return {
        id: r.id,
        titulo: r.titulo,
        tipo: r.tipo,
        periodo: `${toBR(r.periodoIni)} – ${toBR(r.periodoFim)}`,
        formato: r.formato,
        geradoEm: r.geradoEm.toISOString(),
        tamanhoKb: r.tamanhoKb,
        status: r.status,
    };
}
class PrismaRelatorioRepository {
    async criar(input) {
        const data = {
            titulo: input.titulo,
            tipo: input.tipo,
            periodoIni: input.periodoIni,
            periodoFim: input.periodoFim,
            formato: input.formato,
            atendente: { connect: { id: input.atendenteId } },
        };
        if (input.filtros)
            data.filtros = input.filtros;
        const r = await prisma_2.prisma.relatorio.create({ data });
        return rowParaDominio(r);
    }
    async listar(atendenteId) {
        const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const rows = await prisma_2.prisma.relatorio.findMany({
            where: { atendenteId, geradoEm: { gte: desde } },
            orderBy: { geradoEm: 'desc' },
        });
        return rows.map(rowParaDominio);
    }
    async buscarPorId(id, atendenteId) {
        const r = await prisma_2.prisma.relatorio.findFirst({ where: { id, atendenteId } });
        if (!r)
            return null;
        return { ...rowParaDominio(r), caminho: r.caminho };
    }
    async marcarPronto(id, caminho, tamanhoKb) {
        await prisma_2.prisma.relatorio.update({
            where: { id },
            data: { status: prisma_1.StatusRelatorio.DISPONIVEL, caminho, tamanhoKb },
        });
    }
    async marcarFalha(id) {
        await prisma_2.prisma.relatorio.update({ where: { id }, data: { status: prisma_1.StatusRelatorio.FALHA } });
    }
    async atualizarStatus(id, status) {
        await prisma_2.prisma.relatorio.update({ where: { id }, data: { status } });
    }
}
exports.PrismaRelatorioRepository = PrismaRelatorioRepository;
//# sourceMappingURL=PrismaRelatorioRepository.js.map