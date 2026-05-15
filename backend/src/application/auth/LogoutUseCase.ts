import type { ISessaoRepository } from '../../domain/repositories/ISessaoRepository';
import type { ITokenService } from '../../domain/services/ITokenService';

export class LogoutUseCase {
  constructor(
    private readonly sessoes: ISessaoRepository,
    private readonly tokens: ITokenService,
  ) {}

  async exec(refreshToken: string | null, sessaoIdAtual: string | null): Promise<void> {
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
