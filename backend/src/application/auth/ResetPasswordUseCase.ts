import { BadRequest } from '../../shared/errors';
import type { IAtendenteRepository } from '../../domain/repositories/IAtendenteRepository';
import type { IPasswordResetRepository } from '../../domain/repositories/IPasswordResetRepository';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import type { ISessaoRepository } from '../../domain/repositories/ISessaoRepository';

export class ResetPasswordUseCase {
  constructor(
    private readonly atendentes: IAtendenteRepository,
    private readonly resets: IPasswordResetRepository,
    private readonly sessoes: ISessaoRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async exec(resetToken: string, novaSenha: string): Promise<{ sucesso: true }> {
    if (novaSenha.length < 8) {
      throw BadRequest('SENHA_FRACA', 'A nova senha deve ter ao menos 8 caracteres');
    }
    const reset = await this.resets.buscarPorResetToken(resetToken);
    if (!reset) throw BadRequest('TOKEN_INVALIDO', 'Token de redefinição inválido');
    if (reset.consumidoEm) throw BadRequest('TOKEN_INVALIDO', 'Token já utilizado');
    if (reset.expiraEm < new Date()) throw BadRequest('TOKEN_EXPIRADO', 'Token expirado');

    const hash = await this.hasher.hash(novaSenha);
    await this.atendentes.atualizarSenha(reset.atendenteId, hash);
    await this.resets.consumir(reset.id);
    await this.sessoes.revogarTodas(reset.atendenteId);
    await this.atendentes.registrarAtividade(reset.atendenteId, 'Senha redefinida');

    return { sucesso: true };
  }
}
