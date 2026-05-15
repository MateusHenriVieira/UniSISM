import { prisma } from '../../infrastructure/database/prisma';
import { whereByScopeUbs } from '../../infrastructure/database/scopeWhere';
import type { AccessScope } from '../../shared/scope';

export class ListUbsUseCase {
  async exec(scope: AccessScope, prefeituraId?: string) {
    const where = whereByScopeUbs(scope);
    if (prefeituraId) (where as { prefeituraId?: string }).prefeituraId = prefeituraId;
    return prisma.ubs.findMany({
      where,
      include: { prefeitura: true },
      orderBy: { nome: 'asc' },
    });
  }
}
