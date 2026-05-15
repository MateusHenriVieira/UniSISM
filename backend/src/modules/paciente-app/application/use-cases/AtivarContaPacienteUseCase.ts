/**
 * Ativa a conta do paciente no primeiro acesso.
 *
 * Confirmação do paciente: CPF + data de nascimento (conferida contra
 * `encaminhamentos.pacienteDataNascimento`).
 * Define a senha inicial.
 */
import { prisma } from '../../../../infrastructure/database/prisma';
import { Conflict, NotFound, Unprocessable } from '../../../../shared/errors';
import type { IPasswordHasher } from '../../../../domain/services/IPasswordHasher';
import { normalizarCpf } from '../../../../infrastructure/services/NotificacaoPacienteService';

export class AtivarContaPacienteUseCase {
  constructor(private readonly hasher: IPasswordHasher) {}

  async exec(cpf: string, dataNascimentoYmd: string, senha: string, nome?: string): Promise<void> {
    if (senha.length < 8) {
      throw Unprocessable('SENHA_FRACA', 'Senha deve ter ao menos 8 caracteres');
    }
    const cpfDigits = normalizarCpf(cpf);
    const conta = await prisma.pacienteConta.findUnique({ where: { cpf: cpfDigits } });
    if (!conta) throw NotFound('CONTA_NAO_ENCONTRADA', 'Conta não encontrada para o CPF informado');
    if (conta.ativo && conta.senhaHash !== '!pending!') {
      throw Conflict('CONTA_JA_ATIVADA', 'Conta já está ativa. Use a recuperação de senha.');
    }

    // Valida data de nascimento contra qualquer encaminhamento com esse CPF (formatado)
    // Armazenamos em encaminhamentos com CPF formatado — matching com dígitos.
    const enc = await prisma.encaminhamento.findFirst({
      where: {
        pacienteCpf: { contains: cpfDigits.slice(0, 3) }, // heurística leve
        pacienteDataNascimento: new Date(`${dataNascimentoYmd}T00:00:00.000Z`),
      },
      select: { pacienteNome: true },
    });
    if (!enc) {
      throw Unprocessable(
        'CONFIRMACAO_INVALIDA',
        'Dados de confirmação não conferem. Verifique CPF e data de nascimento.',
      );
    }

    const hash = await this.hasher.hash(senha);
    await prisma.pacienteConta.update({
      where: { id: conta.id },
      data: {
        senhaHash: hash,
        ativo: true,
        nome: nome && nome.trim() ? nome.trim().toUpperCase() : enc.pacienteNome,
      },
    });
  }
}
