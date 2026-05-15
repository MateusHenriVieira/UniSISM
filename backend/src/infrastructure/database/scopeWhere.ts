/**
 * Helpers para converter um AccessScope em filtros Prisma reutilizáveis.
 */
import type { Prisma } from '../../../generated/prisma';
import type { AccessScope } from '../../shared/scope';

/**
 * Filtro aplicável a entidades que têm `ubsId` direto + UBS com prefeitura.
 * - GLOBAL  → {} (sem filtro)
 * - PREFEITURA → { ubs: { prefeituraId: X } }
 * - UBS → { ubsId: X }
 */
export function whereByScopeViaUbs(scope: AccessScope): Prisma.EncaminhamentoWhereInput {
  const base: Prisma.EncaminhamentoWhereInput = { deletadoEm: null };
  if (scope.kind === 'GLOBAL') return base;
  if (scope.kind === 'UBS') return { ...base, ubsId: scope.ubsId };
  return { ...base, ubs: { prefeituraId: scope.prefeituraId } };
}

export function whereByScopePaciente(scope: AccessScope): Prisma.PacienteWhereInput {
  const base: Prisma.PacienteWhereInput = { deletadoEm: null };
  if (scope.kind === 'GLOBAL') return base;
  if (scope.kind === 'UBS') return { ...base, ubsId: scope.ubsId };
  return { ...base, ubs: { prefeituraId: scope.prefeituraId } };
}

export function whereByScopeUbs(scope: AccessScope): Prisma.UbsWhereInput {
  const base: Prisma.UbsWhereInput = { deletadoEm: null };
  if (scope.kind === 'GLOBAL') return base;
  if (scope.kind === 'UBS') return { ...base, id: scope.ubsId };
  return { ...base, prefeituraId: scope.prefeituraId };
}

export function whereByScopeAtendente(scope: AccessScope): Prisma.AtendenteWhereInput {
  if (scope.kind === 'GLOBAL') return {};
  if (scope.kind === 'UBS') return { ubsId: scope.ubsId };
  return {
    OR: [
      { prefeituraId: scope.prefeituraId },
      { ubs: { prefeituraId: scope.prefeituraId } },
    ],
  };
}
