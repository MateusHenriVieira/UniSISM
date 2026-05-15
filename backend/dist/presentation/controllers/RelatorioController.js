"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelatorioController = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const zod_1 = require("zod");
const errors_1 = require("../../shared/errors");
const http_1 = require("../../shared/http");
const tipoSchema = zod_1.z.enum([
    'PRODUCAO_INDIVIDUAL',
    'ENCAMINHAMENTOS_POR_ESPECIALIDADE',
    'FILA_REGULACAO',
    'PENDENCIAS_RESOLVIDAS',
    'TFD_CUSTOS',
    'VACINACAO_UBS',
    'BUSCA_ATIVA',
]);
const formatoSchema = zod_1.z.enum(['PDF', 'CSV', 'XLSX']);
const criarSchema = zod_1.z.object({
    tipo: tipoSchema,
    dataInicial: zod_1.z.string(),
    dataFinal: zod_1.z.string(),
    formato: formatoSchema,
    filtros: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
class RelatorioController {
    list;
    create;
    download;
    constructor(list, create, download) {
        this.list = list;
        this.create = create;
        this.download = download;
    }
    getList = async (req, res) => {
        const lista = await this.list.exec(req.auth.sub);
        res.json(lista);
    };
    postCreate = async (req, res) => {
        const body = criarSchema.parse(req.body);
        const r = await this.create.exec(req.auth.sub, body);
        res.status(202).json(r);
    };
    getDownload = async (req, res) => {
        const out = await this.download.exec((0, http_1.paramString)(req, 'id'), req.auth.sub);
        if (!node_fs_1.default.existsSync(out.caminhoAbsoluto)) {
            throw (0, errors_1.NotFound)('ARQUIVO_NAO_ENCONTRADO', 'Arquivo do relatório não encontrado');
        }
        res.set('Content-Type', out.contentType);
        res.set('Content-Disposition', `attachment; filename="${out.filename}"`);
        node_fs_1.default.createReadStream(out.caminhoAbsoluto).pipe(res);
    };
}
exports.RelatorioController = RelatorioController;
//# sourceMappingURL=RelatorioController.js.map