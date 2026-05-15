"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordUseCase = void 0;
const errors_1 = require("../../shared/errors");
class ChangePasswordUseCase {
    atendentes;
    sessoes;
    hasher;
    constructor(atendentes, sessoes, hasher) {
        this.atendentes = atendentes;
        this.sessoes = sessoes;
        this.hasher = hasher;
    }
    async exec(atendenteId, senhaAtual, novaSenha) {
        if (novaSenha.length < 8) {
            throw (0, errors_1.BadRequest)('SENHA_FRACA', 'A nova senha deve ter ao menos 8 caracteres');
        }
        const a = await this.atendentes.buscarPorId(atendenteId);
        if (!a)
            throw (0, errors_1.NotFound)('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');
        const ok = await this.hasher.compare(senhaAtual, a.senhaHash);
        if (!ok)
            throw (0, errors_1.Unauthorized)('SENHA_ATUAL_INCORRETA', 'Senha atual incorreta');
        const novoHash = await this.hasher.hash(novaSenha);
        await this.atendentes.atualizarSenha(atendenteId, novoHash);
        await this.sessoes.revogarTodas(atendenteId);
        await this.atendentes.registrarAtividade(atendenteId, 'Senha alterada');
    }
}
exports.ChangePasswordUseCase = ChangePasswordUseCase;
//# sourceMappingURL=ChangePasswordUseCase.js.map