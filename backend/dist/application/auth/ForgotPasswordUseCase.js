"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForgotPasswordUseCase = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
class ForgotPasswordUseCase {
    atendentes;
    resets;
    hasher;
    constructor(atendentes, resets, hasher) {
        this.atendentes = atendentes;
        this.resets = resets;
        this.hasher = hasher;
    }
    /**
     * Sempre retorna `tokenEnviado: true` (anti-enumeration).
     * Internamente: gera código de 6 dígitos, hasheia, persiste, dispara email.
     */
    async exec(login) {
        const atendente = await this.atendentes.buscarPorLogin(login);
        if (!atendente)
            return { tokenEnviado: true };
        const recentes = await this.resets.solicitacoesRecentes(atendente.id, 60);
        if (recentes >= 1) {
            throw (0, errors_1.TooManyRequests)('RATE_LIMIT', 'Aguarde 60s antes de solicitar novamente');
        }
        const codigo = String(node_crypto_1.default.randomInt(0, 1_000_000)).padStart(6, '0');
        const codigoHash = await this.hasher.hash(codigo);
        const expiraEm = new Date(Date.now() + 10 * 60_000);
        await this.resets.criar({ atendenteId: atendente.id, codigoHash, expiraEm });
        // TODO: integrar SMTP/SES — por ora, log estruturado.
        logger_1.logger.info({ matricula: atendente.matricula, codigo, expiraEm }, 'código de redefinição gerado (substituir por envio de email)');
        return { tokenEnviado: true };
    }
}
exports.ForgotPasswordUseCase = ForgotPasswordUseCase;
//# sourceMappingURL=ForgotPasswordUseCase.js.map