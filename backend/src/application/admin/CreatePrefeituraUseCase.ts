import { prisma } from '../../infrastructure/database/prisma';
import { Conflict } from '../../shared/errors';

export interface CreatePrefeituraInput {
  nome: string;
  municipio: string;
  uf: string;
  cnpj?: string;
}

export class CreatePrefeituraUseCase {
  async exec(input: CreatePrefeituraInput) {
    if (input.cnpj) {
      const exists = await prisma.prefeitura.findUnique({ where: { cnpj: input.cnpj } });
      if (exists) throw Conflict('PREFEITURA_DUPLICADA', 'CNPJ já cadastrado');
    }
    return prisma.prefeitura.create({ data: input });
  }
}
