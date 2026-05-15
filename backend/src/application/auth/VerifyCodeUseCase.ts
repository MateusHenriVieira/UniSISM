import crypto from 'node:crypto';
import type { IAtendenteRepository } from '../../domain/repositories/IAtendenteRepository';
import type { IPasswordResetRepository } from '../../domain/repositories/IPasswordResetRepository';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';

export interface VerifyCodeOutput {
  valido: boolean;
  resetToken?: string;
}

export class VerifyCodeUseCase {
  constructor(
    private readonly atendentes: IAtendenteRepository,
    private readonly resets: IPasswordResetRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async exec(login: string, codigo: string): Promise<VerifyCodeOutput> {
    const atendente = await this.atendentes.buscarPorLogin(login);
    if (!atendente) return { valido: false };

    const reset = await this.resets.buscarVigentePorAtendente(atendente.id);
    if (!reset) return { valido: false };

    if (reset.tentativas >= 5) return { valido: false };

    const ok = await this.hasher.compare(codigo, reset.codigoHash);
    if (!ok) {
      await this.resets.incrementarTentativas(reset.id);
      return { valido: false };
    }

    const resetToken = `tkn-${crypto.randomBytes(24).toString('hex')}`;
    await this.resets.vincularResetToken(reset.id, resetToken);

    return { valido: true, resetToken };
  }
}
