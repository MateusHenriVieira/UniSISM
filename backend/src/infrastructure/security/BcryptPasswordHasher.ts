import bcrypt from 'bcryptjs';
import { env } from '../../shared/env';
import type { IPasswordHasher } from '../../domain/services/IPasswordHasher';

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(senha: string): Promise<string> {
    return bcrypt.hash(senha, env.BCRYPT_ROUNDS);
  }

  async compare(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }
}
