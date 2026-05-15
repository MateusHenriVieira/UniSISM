"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyCodeUseCase = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class VerifyCodeUseCase {
    atendentes;
    resets;
    hasher;
    constructor(atendentes, resets, hasher) {
        this.atendentes = atendentes;
        this.resets = resets;
        this.hasher = hasher;
    }
    async exec(login, codigo) {
        const atendente = await this.atendentes.buscarPorLogin(login);
        if (!atendente)
            return { valido: false };
        const reset = await this.resets.buscarVigentePorAtendente(atendente.id);
        if (!reset)
            return { valido: false };
        if (reset.tentativas >= 5)
            return { valido: false };
        const ok = await this.hasher.compare(codigo, reset.codigoHash);
        if (!ok) {
            await this.resets.incrementarTentativas(reset.id);
            return { valido: false };
        }
        const resetToken = `tkn-${node_crypto_1.default.randomBytes(24).toString('hex')}`;
        await this.resets.vincularResetToken(reset.id, resetToken);
        return { valido: true, resetToken };
    }
}
exports.VerifyCodeUseCase = VerifyCodeUseCase;
//# sourceMappingURL=VerifyCodeUseCase.js.map