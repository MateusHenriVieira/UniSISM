/**
 * Login do paciente no app.
 *
 * Chave: CPF + senha.
 * Contas criadas automaticamente por notificação começam "pendentes" (senhaHash = '!pending!'
 * e ativo=false). O paciente ativa via `POST /paciente-app/auth/ativar-conta` usando CPF +
 * data de nascimento (confirmação simples) + nova senha. [roadmap]
 *
 * Enquanto a conta estiver `ativo=false` ou senhaHash=='!pending!', o login é rejeitado.
 */
import crypto from 'node:crypto';
import { prisma } from '../../../../infrastructure/database/prisma';
import { Forbidden, Unauthorized } from '../../../../shared/errors';
import type { IPasswordHasher } from '../../../../domain/services/IPasswordHasher';
import {
  formatarCpf,
  normalizarCpf,
} from '../../../../infrastructure/services/NotificacaoPacienteService';

export interface LoginPacienteOutput {
  token: string;
  expiresIn: number;
  paciente: {
    id: string;
    cpf: string;
    cpfFormatado: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    /** true quando a senha ainda é o CPF — app deve forçar troca. */
    senhaProvisoria: boolean;
  };
}

export class LoginPacienteUseCase {
  constructor(private readonly hasher: IPasswordHasher) {}

  async exec(
    cpf: string,
    senha: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginPacienteOutput> {
    const cpfDigits = normalizarCpf(cpf);
    const conta = await prisma.pacienteConta.findUnique({ where: { cpf: cpfDigits } });
    if (!conta) {
      throw Unauthorized('CREDENCIAIS_INVALIDAS', 'CPF ou senha inválidos');
    }
    // Contas criadas automaticamente no primeiro encaminhamento já nascem
    // ATIVAS com senha = CPF (senhaProvisoria=true). O app do paciente deve
    // forçar a troca no primeiro login. Só bloqueia se o admin desativar.
    if (!conta.ativo) {
      throw Forbidden(
        'CONTA_DESATIVADA',
        'Conta desativada. Procure sua UBS para reativação.',
      );
    }
    const ok = await this.hasher.compare(senha, conta.senhaHash);
    if (!ok) throw Unauthorized('CREDENCIAIS_INVALIDAS', 'CPF ou senha inválidos');

    // Gera token opaco (não JWT — mais simples de revogar)
    const token = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.sessaoPaciente.create({
      data: {
        contaId: conta.id,
        tokenHash,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        expiraEm,
      },
    });

    return {
      token,
      expiresIn: 24 * 60 * 60,
      paciente: {
        id: conta.id,
        cpf: cpfDigits,
        cpfFormatado: conta.cpfFormatado || formatarCpf(cpfDigits),
        nome: conta.nome,
        email: conta.email,
        telefone: conta.telefone,
        senhaProvisoria: conta.senhaProvisoria,
      },
    };
  }
}
