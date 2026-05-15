"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadRelatorioUseCase = void 0;
const errors_1 = require("../../shared/errors");
const MIME = {
    PDF: 'application/pdf',
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
class DownloadRelatorioUseCase {
    repo;
    storage;
    constructor(repo, storage) {
        this.repo = repo;
        this.storage = storage;
    }
    async exec(id, atendenteId) {
        const r = await this.repo.buscarPorId(id, atendenteId);
        if (!r)
            throw (0, errors_1.NotFound)('RELATORIO_NAO_ENCONTRADO', 'Relatório não encontrado');
        if (r.status !== 'DISPONIVEL' || !r.caminho) {
            throw (0, errors_1.Conflict)('RELATORIO_NAO_DISPONIVEL', 'Relatório ainda não está disponível');
        }
        return {
            relatorio: r,
            caminhoAbsoluto: this.storage.caminhoAbsoluto(r.caminho),
            contentType: MIME[r.formato],
            filename: `${r.tipo.toLowerCase()}-${r.id}.${r.formato.toLowerCase()}`,
        };
    }
}
exports.DownloadRelatorioUseCase = DownloadRelatorioUseCase;
//# sourceMappingURL=DownloadRelatorioUseCase.js.map