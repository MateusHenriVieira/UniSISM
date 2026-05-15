/**
 * Troca de senha do paciente autenticado.
 *
 * Fluxo:
 *  1. Paciente loga com CPF + senha (CPF = senha provisória no primeiro acesso)
 *  2. Troca a senha via este endpoint
 *  3. senhaProvisoria vira `false` — app libera navegação normal
 *
 * Exige `senhaAtual` como prova de posse (zero-trust).
 */
import { prisma } from '../../../../infrastructure/database/prisma';
import { Unauthorized, Unprocessable } from '../../../../shared/errors';
import type { IPasswordHasher } from '../../../../domain/services/IPasswordHasher';

export class TrocarSenhaPacienteUseCase {
  constructor(private readonly hasher: IPasswordHasher) {}

  async exec(contaId: string, senhaAtual: string, novaSenha: string): Promise<void> {
    if (novaSenha.length < 8) {
      throw Unprocessable('SENHA_FRACA', 'Nova senha deve ter ao menos 8 caracteres');
    }
    if (senhaAtual === novaSenha) {
      throw Unprocessable(
        'SENHA_IGUAL_ATUAL',
        'A nova senha deve ser diferente da atual',
      );
    }

    const conta = await prisma.pacienteConta.findUnique({ where: { id: contaId } });
    if (!conta) throw Unauthorized('CREDENCIAIS_INVALIDAS', 'Sessão inválida');

    const ok = await this.hasher.compare(senhaAtual, conta.senhaHash);
    if (!ok) throw Unauthorized('CREDENCIAIS_INVALIDAS', 'Senha atual incorreta');

    const novoHash = await this.hasher.hash(novaSenha);
    await prisma.pacienteConta.update({
      where: { id: contaId },
      data: {
        senhaHash: novoHash,
        senhaProvisoria: false,
      },
    });
  }
}
