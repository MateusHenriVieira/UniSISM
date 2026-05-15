"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutUseCase = void 0;
class LogoutUseCase {
    sessoes;
    tokens;
    constructor(sessoes, tokens) {
        this.sessoes = sessoes;
        this.tokens = tokens;
    }
    async exec(refreshToken, sessaoIdAtual) {
        if (refreshToken) {
            const hash = this.tokens.hashRefresh(refreshToken);
            await this.sessoes.revogarPorRefreshHash(hash);
            return;
        }
        // fallback: revoga apenas a sessão atual derivada do JWT
        if (sessaoIdAtual) {
            // hack simples: reutiliza revogarOutras para invalidar tudo da sessão atual
            // não é o ideal, mas evita endpoint a mais por agora
            // (em produção: lookup de sessão por id direto)
            await this.sessoes.revogarPorRefreshHash(`__sid:${sessaoIdAtual}`);
        }
    }
}
exports.LogoutUseCase = LogoutUseCase;
//# sourceMappingURL=LogoutUseCase.js.map