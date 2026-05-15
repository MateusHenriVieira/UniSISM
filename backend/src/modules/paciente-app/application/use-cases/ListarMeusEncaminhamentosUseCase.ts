import { prisma } from '../../../../infrastructure/database/prisma';
import {
  INCLUDE_ENCAMINHAMENTO_FULL,
  rowParaEncaminhamento,
} from '../../../../infrastructure/database/encaminhamentoMapper';
import type { Encaminhamento } from '../../../../domain/entities/Encaminhamento';

/**
 * Lista encaminhamentos do paciente autenticado.
 * Busca todos os `encaminhamentos` onde `pacienteCpf` (formatado no backend)
 * corresponde ao CPF da conta.
 */
export class ListarMeusEncaminhamentosUseCase {
  async exec(cpfDigits: string, cpfFormatado: string): Promise<Encaminhamento[]> {
    // O encaminhamento armazena o CPF formatado ("123.456.789-00"), mas aceitamos ambos.
    const rows = await prisma.encaminhamento.findMany({
      where: {
        OR: [{ pacienteCpf: cpfFormatado }, { pacienteCpf: cpfDigits }],
      },
      include: INCLUDE_ENCAMINHAMENTO_FULL,
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });
    return rows.map(rowParaEncaminhamento);
  }
}
