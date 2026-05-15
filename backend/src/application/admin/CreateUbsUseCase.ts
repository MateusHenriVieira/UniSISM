import { prisma } from '../../infrastructure/database/prisma';
import { Conflict, NotFound } from '../../shared/errors';
import { ensurePrefeituraAcessivel, type AccessScope } from '../../shared/scope';

export interface CreateUbsInput {
  nome: string;
  municipio: string;
  uf: string;
  prefeituraId: string;
  endereco?: string;
  cnes?: string;
}

export class CreateUbsUseCase {
  async exec(scope: AccessScope, input: CreateUbsInput) {
    const prefeitura = await prisma.prefeitura.findUnique({ where: { id: input.prefeituraId } });
    if (!prefeitura) throw NotFound('PREFEITURA_NAO_ENCONTRADA', 'Prefeitura não encontrada');
    ensurePrefeituraAcessivel(scope, prefeitura.id);

    if (input.cnes) {
      const exists = await prisma.ubs.findUnique({ where: { cnes: input.cnes } });
      if (exists) throw Conflict('UBS_DUPLICADA', 'CNES já cadastrado');
    }

    return prisma.ubs.create({ data: input });
  }
}
