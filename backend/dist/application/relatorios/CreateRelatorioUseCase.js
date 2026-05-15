"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRelatorioUseCase = void 0;
const logger_1 = require("../../infrastructure/logger");
const TITULOS = {
    PRODUCAO_INDIVIDUAL: 'Produção Individual',
    ENCAMINHAMENTOS_POR_ESPECIALIDADE: 'Encaminhamentos por Especialidade',
    FILA_REGULACAO: 'Fila de Regulação',
    PENDENCIAS_RESOLVIDAS: 'Pendências Resolvidas',
    TFD_CUSTOS: 'TFD · Custos',
    VACINACAO_UBS: 'Vacinação UBS',
    BUSCA_ATIVA: 'Busca Ativa',
};
function fmtBR(d) {
    return d.toLocaleDateString('pt-BR');
}
class CreateRelatorioUseCase {
    repo;
    storage;
    constructor(repo, storage) {
        this.repo = repo;
        this.storage = storage;
    }
    async exec(atendenteId, payload) {
        const periodoIni = new Date(payload.dataInicial);
        const periodoFim = new Date(payload.dataFinal);
        const titulo = `${TITULOS[payload.tipo]} · ${fmtBR(periodoIni)} – ${fmtBR(periodoFim)}`;
        const relatorio = await this.repo.criar({
            atendenteId,
            titulo,
            tipo: payload.tipo,
            formato: payload.formato,
            periodoIni,
            periodoFim,
            ...(payload.filtros ? { filtros: payload.filtros } : {}),
        });
        // Geração assíncrona simples (fire-and-forget). Em produção: BullMQ/SQS.
        void this.gerarArquivo(relatorio).catch((err) => logger_1.logger.error({ err, relatorioId: relatorio.id }, 'falha ao gerar relatório'));
        return relatorio;
    }
    async gerarArquivo(relatorio) {
        const conteudo = Buffer.from(`Relatório ${relatorio.titulo}\nTipo: ${relatorio.tipo}\nGerado em: ${relatorio.geradoEm}\n` +
            `(Stub — substituir por geração real em produção)\n`, 'utf8');
        const ext = relatorio.formato.toLowerCase();
        const arq = await this.storage.salvar({
            nomeOriginal: `${relatorio.id}.${ext}`,
            mimeType: this.mimeFromFormato(relatorio.formato),
            buffer: conteudo,
            pasta: 'relatorios',
        });
        await this.repo.marcarPronto(relatorio.id, arq.caminho, arq.tamanhoKb);
    }
    mimeFromFormato(formato) {
        switch (formato) {
            case 'PDF':
                return 'application/pdf';
            case 'CSV':
                return 'text/csv';
            case 'XLSX':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
    }
}
exports.CreateRelatorioUseCase = CreateRelatorioUseCase;
//# sourceMappingURL=CreateRelatorioUseCase.js.map