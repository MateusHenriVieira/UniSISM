"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokeOtherSessionsUseCase = void 0;
class RevokeOtherSessionsUseCase {
    sessoes;
    constructor(sessoes) {
        this.sessoes = sessoes;
    }
    async exec(atendenteId, sessaoIdAtual) {
        const encerradas = await this.sessoes.revogarOutras(atendenteId, sessaoIdAtual);
        return { encerradas };
    }
}
exports.RevokeOtherSessionsUseCase = RevokeOtherSessionsUseCase;
//# sourceMappingURL=RevokeOtherSessionsUseCase.js.map