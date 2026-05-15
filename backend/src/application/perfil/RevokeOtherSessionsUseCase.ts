import type { ISessaoRepository } from '../../domain/repositories/ISessaoRepository';

export class RevokeOtherSessionsUseCase {
  constructor(private readonly sessoes: ISessaoRepository) {}

  async exec(atendenteId: string, sessaoIdAtual: string): Promise<{ encerradas: number }> {
    const encerradas = await this.sessoes.revogarOutras(atendenteId, sessaoIdAtual);
    return { encerradas };
  }
}
