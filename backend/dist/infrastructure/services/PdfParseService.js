"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParseService = void 0;
const logger_1 = require("../logger");
let pdfParseCache = null;
async function getPdfParse() {
    if (pdfParseCache)
        return pdfParseCache;
    const mod = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
    const candidate = mod.default ??
        mod.pdf ??
        mod;
    if (typeof candidate !== 'function') {
        throw new Error('pdf-parse não exportou função utilizável');
    }
    pdfParseCache = candidate;
    return pdfParseCache;
}
const RE_CPF = /(\d{3}\.\d{3}\.\d{3}-\d{2})/;
const RE_CARTAO_SUS = /(\d{3}\s?\d{4}\s?\d{4}\s?\d{4})/;
const RE_DATA_BR = /(\d{2}\/\d{2}\/\d{4})/;
const RE_TELEFONE = /\((\d{2})\)\s?(\d{4,5})-?(\d{4})/;
const RE_CRM = /CRM[\s/]*([A-Z]{2})\s*([\d.]+)/i;
const RE_CID = /\b([A-Z]\d{2}(?:\.\d)?)\b/;
function brDateParaIso(br) {
    const partes = br.split('/');
    if (partes.length !== 3)
        return '';
    const [d, m, y] = partes;
    return `${y}-${(m ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
}
function pickAposLabel(texto, labels) {
    for (const label of labels) {
        const re = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`, 'i');
        const m = re.exec(texto);
        if (m && m[1])
            return m[1].trim();
    }
    return '';
}
function detectarPrioridade(texto) {
    const t = texto.toUpperCase();
    if (/EMERGENC/.test(t))
        return 'EMERGENCIA';
    if (/URG[ÊE]NC/.test(t))
        return 'URGENTE';
    if (/PRIORIT/.test(t))
        return 'PRIORITARIA';
    return 'ELETIVA';
}
function detectarSexo(texto) {
    const m = /sexo\s*[:\-]?\s*(m|f|masc|fem)/i.exec(texto);
    if (!m)
        return 'OUTRO';
    const v = (m[1] ?? '').toLowerCase();
    if (v.startsWith('m'))
        return 'M';
    if (v.startsWith('f'))
        return 'F';
    return 'OUTRO';
}
class PdfParseService {
    async extrair(buffer) {
        let texto = '';
        try {
            const pdfParse = await getPdfParse();
            const resultado = await pdfParse(buffer);
            texto = resultado.text ?? '';
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'falha ao extrair PDF; retornando shape vazio');
        }
        const cpf = RE_CPF.exec(texto)?.[1] ?? '';
        const cartaoSus = RE_CARTAO_SUS.exec(texto)?.[1] ?? '';
        const dataNascBr = (() => {
            const m = /nascimento[^0-9]*(\d{2}\/\d{2}\/\d{4})/i.exec(texto);
            return m?.[1] ?? '';
        })();
        const dataSolicBr = (() => {
            const m = /solicita[cç][aã]o[^0-9]*(\d{2}\/\d{2}\/\d{4})/i.exec(texto);
            return m?.[1] ?? RE_DATA_BR.exec(texto)?.[1] ?? '';
        })();
        const telefoneMatch = RE_TELEFONE.exec(texto);
        const telefone = telefoneMatch
            ? `(${telefoneMatch[1]}) ${telefoneMatch[2]}-${telefoneMatch[3]}`
            : '';
        const crmMatch = RE_CRM.exec(texto);
        const crm = crmMatch ? `CRM/${(crmMatch[1] ?? '').toUpperCase()} ${crmMatch[2] ?? ''}` : '';
        const cid10 = RE_CID.exec(texto)?.[1] ?? '';
        const paciente = {
            nome: pickAposLabel(texto, ['paciente', 'nome do paciente', 'nome']).toUpperCase(),
            cpf,
            cartaoSus,
            dataNascimento: dataNascBr ? brDateParaIso(dataNascBr) : '',
            sexo: detectarSexo(texto),
            telefone,
            endereco: pickAposLabel(texto, ['endere[çc]o']).toUpperCase(),
        };
        const solicitacao = {
            medicoSolicitante: pickAposLabel(texto, ['m[eé]dico solicitante', 'solicitante']).toUpperCase(),
            crm,
            especialidadeSolicitada: pickAposLabel(texto, ['especialidade']).trim(),
            cid10,
            cidDescricao: pickAposLabel(texto, ['descri[çc][ãa]o', 'cid descri']),
            justificativaClinica: pickAposLabel(texto, ['justificativa', 'hist[oó]rico cl[íi]nico']),
            prioridade: detectarPrioridade(texto),
            dataSolicitacao: dataSolicBr ? brDateParaIso(dataSolicBr) : '',
        };
        const criticos = [
            paciente.nome,
            paciente.cpf,
            solicitacao.especialidadeSolicitada,
            solicitacao.cid10,
            solicitacao.justificativaClinica,
        ];
        const preenchidos = criticos.filter((c) => c && c.length > 0).length;
        const confianca = Number((preenchidos / criticos.length).toFixed(2));
        return { paciente, solicitacao, confiancaExtracao: confianca };
    }
}
exports.PdfParseService = PdfParseService;
//# sourceMappingURL=PdfParseService.js.map