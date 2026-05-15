"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordUseCase = void 0;
const errors_1 = require("../../shared/errors");
class ResetPasswordUseCase {
    atendentes;
    resets;
    sessoes;
    hasher;
    constructor(atendentes, resets, sessoes, hasher) {
        this.atendentes = atendentes;
        this.resets = resets;
        this.sessoes = sessoes;
        this.hasher = hasher;
    }
    async exec(resetToken, novaSenha) {
        if (novaSenha.length < 8) {
            throw (0, errors_1.BadRequest)('SENHA_FRACA', 'A nova senha deve ter ao menos 8 caracteres');
        }
        const reset = await this.resets.buscarPorResetToken(resetToken);
        if (!reset)
            throw (0, errors_1.BadRequest)('TOKEN_INVALIDO', 'Token de redefinição inválido');
        if (reset.consumidoEm)
            throw (0, errors_1.BadRequest)('TOKEN_INVALIDO', 'Token já utilizado');
        if (reset.expiraEm < new Date())
            throw (0, errors_1.BadRequest)('TOKEN_EXPIRADO', 'Token expirado');
        const hash = await this.hasher.hash(novaSenha);
        await this.atendentes.atualizarSenha(reset.atendenteId, hash);
        await this.resets.consumir(reset.id);
        await this.sessoes.revogarTodas(reset.atendenteId);
        await this.atendentes.registrarAtividade(reset.atendenteId, 'Senha redefinida');
        return { sucesso: true };
    }
}
exports.ResetPasswordUseCase = ResetPasswordUseCase;
//# sourceMappingURL=ResetPasswordUseCase.js.map