"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncaminhamentoController = void 0;
const errors_1 = require("../../shared/errors");
const http_1 = require("../../shared/http");
const encaminhamentoSchemas_1 = require("../schemas/encaminhamentoSchemas");
const MIMES_ANEXO = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;
function getFiles(req, field) {
    const files = req.files ?? {};
    return files[field] ?? [];
}
class EncaminhamentoController {
    extractPdf;
    create;
    list;
    getOne;
    resolver;
    atendentes;
    constructor(extractPdf, create, list, getOne, resolver, atendentes) {
        this.extractPdf = extractPdf;
        this.create = create;
        this.list = list;
        this.getOne = getOne;
        this.resolver = resolver;
        this.atendentes = atendentes;
    }
    postExtractPdf = async (req, res) => {
        const file = req.file;
        if (!file)
            throw (0, errors_1.BadRequest)('ARQUIVO_INVALIDO', 'Arquivo PDF não enviado');
        if (file.mimetype !== 'application/pdf') {
            throw (0, errors_1.UnsupportedMediaType)('MIME_NAO_SUPORTADO', 'Apenas PDF é aceito');
        }
        if (file.size > MAX_BYTES) {
            throw (0, errors_1.PayloadTooLarge)('ARQUIVO_MUITO_GRANDE', 'PDF excede o limite de 10 MB');
        }
        const out = await this.extractPdf.exec(file.buffer);
        res.json(out);
    };
    postCreate = async (req, res) => {
        const payloadRaw = req.body?.payload;
        if (typeof payloadRaw !== 'string') {
            throw (0, errors_1.BadRequest)('PAYLOAD_AUSENTE', 'Campo "payload" (JSON) é obrigatório');
        }
        let parsed;
        try {
            parsed = JSON.parse(payloadRaw);
        }
        catch {
            throw (0, errors_1.BadRequest)('PAYLOAD_INVALIDO', 'Payload não é um JSON válido');
        }
        const payload = encaminhamentoSchemas_1.consolidarPayloadSchema.parse(parsed);
        const solicFile = getFiles(req, 'solicitacao')[0];
        const anexoFiles = getFiles(req, 'anexo');
        const tipoAnexoRaw = req.body?.tipoAnexo;
        const tiposAnexo = Array.isArray(tipoAnexoRaw)
            ? tipoAnexoRaw.map(String)
            : tipoAnexoRaw
                ? [String(tipoAnexoRaw)]
                : [];
        const anexos = anexoFiles.map((f, i) => {
            if (!MIMES_ANEXO.has(f.mimetype)) {
                throw (0, errors_1.UnsupportedMediaType)('MIME_NAO_SUPORTADO', `Anexo ${f.originalname}: MIME inválido`);
            }
            const tipo = encaminhamentoSchemas_1.tipoAnexoSchema.safeParse(tiposAnexo[i] ?? 'OUTRO');
            return {
                nomeOriginal: f.originalname,
                mimeType: f.mimetype,
                buffer: f.buffer,
                tipo: tipo.success ? tipo.data : 'OUTRO',
            };
        });
        const atendente = await this.atendentes.buscarPorId(req.auth.sub);
        if (!atendente)
            throw (0, errors_1.NotFound)('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');
        const enc = await this.create.exec({
            paciente: payload.paciente,
            solicitacao: payload.solicitacao,
            ubsId: req.auth.ubsId,
            atendenteId: req.auth.sub,
            unidadeOrigem: `${atendente.ubs.nome} - ${atendente.ubs.municipio}`,
            atendenteResponsavel: atendente.nome,
            ...(solicFile
                ? {
                    solicitacaoPdf: {
                        nomeOriginal: solicFile.originalname,
                        mimeType: solicFile.mimetype,
                        buffer: solicFile.buffer,
                        tipo: 'SOLICITACAO',
                    },
                }
                : {}),
            anexos,
        });
        await this.atendentes.registrarAtividade(req.auth.sub, 'Consolidou encaminhamento', enc.protocolo);
        res.status(201).json({ id: enc.id, protocolo: enc.protocolo });
    };
    getList = async (req, res) => {
        const q = encaminhamentoSchemas_1.listarQuerySchema.parse(req.query);
        const lista = await this.list.exec({
            ubsId: req.auth.ubsId,
            ...(q.status ? { status: q.status } : {}),
            ...(q.pacienteId ? { pacienteId: q.pacienteId } : {}),
            ...(q.desde ? { desde: new Date(q.desde) } : {}),
            ...(q.ate ? { ate: new Date(q.ate) } : {}),
            ...(q.limit ? { limit: q.limit } : {}),
        });
        res.json(lista);
    };
    getById = async (req, res) => {
        const enc = await this.getOne.exec((0, http_1.paramString)(req, 'id'), req.auth.ubsId);
        res.json(enc);
    };
    postResolverPendencia = async (req, res) => {
        const nota = String(req.body?.nota ?? '');
        const anexoFiles = req.files ?? [];
        const tiposRaw = req.body?.tipoAnexo;
        const tipos = Array.isArray(tiposRaw)
            ? tiposRaw.map(String)
            : tiposRaw
                ? [String(tiposRaw)]
                : [];
        const anexos = anexoFiles.map((f, i) => {
            if (!MIMES_ANEXO.has(f.mimetype)) {
                throw (0, errors_1.UnsupportedMediaType)('MIME_NAO_SUPORTADO', `Anexo ${f.originalname}: MIME inválido`);
            }
            const tipo = encaminhamentoSchemas_1.tipoAnexoSchema.safeParse(tipos[i] ?? 'OUTRO');
            return {
                nomeOriginal: f.originalname,
                mimeType: f.mimetype,
                buffer: f.buffer,
                tipo: tipo.success ? tipo.data : 'OUTRO',
            };
        });
        const atendente = await this.atendentes.buscarPorId(req.auth.sub);
        if (!atendente)
            throw (0, errors_1.NotFound)('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');
        const enc = await this.resolver.exec({
            id: (0, http_1.paramString)(req, 'id'),
            ubsId: req.auth.ubsId,
            nota,
            autor: atendente.nome,
            autorPapel: `Atendente · ${atendente.ubs.nome}`,
            anexos,
        });
        await this.atendentes.registrarAtividade(req.auth.sub, 'Resolveu pendência', enc.protocolo);
        res.json(enc);
    };
}
exports.EncaminhamentoController = EncaminhamentoController;
//# sourceMappingURL=EncaminhamentoController.js.map