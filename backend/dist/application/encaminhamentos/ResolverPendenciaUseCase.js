"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolverPendenciaUseCase = void 0;
const errors_1 = require("../../shared/errors");
class ResolverPendenciaUseCase {
    repo;
    storage;
    constructor(repo, storage) {
        this.repo = repo;
        this.storage = storage;
    }
    async exec(input) {
        if ((!input.nota || input.nota.trim().length === 0) && input.anexos.length === 0) {
            throw (0, errors_1.Unprocessable)('NENHUMA_ACAO_FORNECIDA', 'Forneça uma nota ou ao menos um anexo');
        }
        const pasta = `encaminhamentos/pendencias/${new Date().toISOString().slice(0, 7)}`;
        const novosAnexos = [];
        for (const a of input.anexos) {
            const arq = await this.storage.salvar({
                nomeOriginal: a.nomeOriginal,
                mimeType: a.mimeType,
                buffer: a.buffer,
                pasta,
            });
            novosAnexos.push({
                nome: a.nomeOriginal,
                tipo: a.tipo,
                tamanhoKb: arq.tamanhoKb,
                mimeType: a.mimeType,
                caminho: arq.caminho,
            });
        }
        return this.repo.resolverPendencia(input.id, input.ubsId, {
            nota: input.nota || 'Pendência respondida',
            autor: input.autor,
            autorPapel: input.autorPapel,
            novosAnexos,
        });
    }
}
exports.ResolverPendenciaUseCase = ResolverPendenciaUseCase;
//# sourceMappingURL=ResolverPendenciaUseCase.js.map