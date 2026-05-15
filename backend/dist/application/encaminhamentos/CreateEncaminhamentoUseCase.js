"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEncaminhamentoUseCase = void 0;
const errors_1 = require("../../shared/errors");
class CreateEncaminhamentoUseCase {
    encaminhamentos;
    storage;
    constructor(encaminhamentos, storage) {
        this.encaminhamentos = encaminhamentos;
        this.storage = storage;
    }
    async exec(input) {
        if (!input.paciente.cpf || !input.paciente.nome || !input.solicitacao.especialidadeSolicitada) {
            throw (0, errors_1.Unprocessable)('DADOS_OBRIGATORIOS_AUSENTES', 'Faltam campos obrigatórios (CPF, nome ou especialidade)');
        }
        const pasta = `encaminhamentos/${new Date().toISOString().slice(0, 7)}`;
        const anexosPersistidos = [];
        if (input.solicitacaoPdf) {
            const arq = await this.storage.salvar({
                nomeOriginal: input.solicitacaoPdf.nomeOriginal,
                mimeType: input.solicitacaoPdf.mimeType,
                buffer: input.solicitacaoPdf.buffer,
                pasta,
            });
            anexosPersistidos.push({
                nome: input.solicitacaoPdf.nomeOriginal,
                tipo: 'SOLICITACAO',
                tamanhoKb: arq.tamanhoKb,
                mimeType: input.solicitacaoPdf.mimeType,
                caminho: arq.caminho,
            });
        }
        for (const a of input.anexos) {
            const arq = await this.storage.salvar({
                nomeOriginal: a.nomeOriginal,
                mimeType: a.mimeType,
                buffer: a.buffer,
                pasta,
            });
            anexosPersistidos.push({
                nome: a.nomeOriginal,
                tipo: a.tipo,
                tamanhoKb: arq.tamanhoKb,
                mimeType: a.mimeType,
                caminho: arq.caminho,
            });
        }
        return this.encaminhamentos.criar({
            paciente: input.paciente,
            solicitacao: input.solicitacao,
            ubsId: input.ubsId,
            atendenteId: input.atendenteId,
            unidadeOrigem: input.unidadeOrigem,
            atendenteResponsavel: input.atendenteResponsavel,
            anexos: anexosPersistidos,
        });
    }
}
exports.CreateEncaminhamentoUseCase = CreateEncaminhamentoUseCase;
//# sourceMappingURL=CreateEncaminhamentoUseCase.js.map