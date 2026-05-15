"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusEncaminhamentoSchema = exports.tipoAnexoSchema = exports.listarQuerySchema = exports.consolidarPayloadSchema = exports.solicitacaoSchema = exports.pacienteSchema = void 0;
const zod_1 = require("zod");
const sexoSchema = zod_1.z.enum(['M', 'F', 'OUTRO']);
const prioridadeSchema = zod_1.z.enum(['ELETIVA', 'PRIORITARIA', 'URGENTE', 'EMERGENCIA']);
const tipoAnexoSchema = zod_1.z.enum([
    'SOLICITACAO',
    'RG',
    'CPF',
    'CARTAO_SUS',
    'EXAME',
    'LAUDO',
    'OUTRO',
]);
exports.tipoAnexoSchema = tipoAnexoSchema;
const statusEncaminhamentoSchema = zod_1.z.enum([
    'RASCUNHO',
    'AGUARDANDO_REGULACAO',
    'PENDENCIA_DOCUMENTO',
    'APROVADO',
    'REJEITADO',
]);
exports.statusEncaminhamentoSchema = statusEncaminhamentoSchema;
exports.pacienteSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1),
    cpf: zod_1.z.string().min(1),
    cartaoSus: zod_1.z.string().default(''),
    dataNascimento: zod_1.z.string().default(''),
    sexo: sexoSchema.default('OUTRO'),
    telefone: zod_1.z.string().default(''),
    endereco: zod_1.z.string().default(''),
});
exports.solicitacaoSchema = zod_1.z.object({
    medicoSolicitante: zod_1.z.string().default(''),
    crm: zod_1.z.string().default(''),
    especialidadeSolicitada: zod_1.z.string().min(1),
    cid10: zod_1.z.string().default(''),
    cidDescricao: zod_1.z.string().default(''),
    justificativaClinica: zod_1.z.string().default(''),
    prioridade: prioridadeSchema.default('ELETIVA'),
    dataSolicitacao: zod_1.z.string().default(''),
});
exports.consolidarPayloadSchema = zod_1.z.object({
    paciente: exports.pacienteSchema,
    solicitacao: exports.solicitacaoSchema,
});
exports.listarQuerySchema = zod_1.z.object({
    status: statusEncaminhamentoSchema.optional(),
    pacienteId: zod_1.z.string().optional(),
    desde: zod_1.z.string().optional(),
    ate: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(500).optional(),
});
//# sourceMappingURL=encaminhamentoSchemas.js.map