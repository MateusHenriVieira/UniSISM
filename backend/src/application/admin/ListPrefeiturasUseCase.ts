import { prisma } from '../../infrastructure/database/prisma';
import type { AccessScope } from '../../shared/scope';

export class ListPrefeiturasUseCase {
  async exec(scope: AccessScope) {
    const base = { deletadoEm: null as Date | null };
    if (scope.kind === 'GLOBAL') {
      return prisma.prefeitura.findMany({ where: base, orderBy: { nome: 'asc' } });
    }
    if (scope.kind === 'PREFEITURA') {
      return prisma.prefeitura.findMany({
        where: { ...base, id: scope.prefeituraId },
      });
    }
    return prisma.prefeitura.findMany({
      where: { ...base, id: scope.prefeituraId ?? '__none__' },
    });
  }
}
