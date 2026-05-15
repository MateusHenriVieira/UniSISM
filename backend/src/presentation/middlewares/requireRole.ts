import type { Request, Response, NextFunction } from 'express';
import { Forbidden } from '../../shared/errors';
import type { RoleAtendente } from '../../../generated/prisma';

export function requireRole(...roles: RoleAtendente[]) {
  return function guard(req: Request, _res: Response, next: NextFunction): void {
    const auth = req.auth;
    if (!auth) return next(Forbidden('NAO_AUTENTICADO', 'Não autenticado'));
    if (!roles.includes(auth.role as RoleAtendente)) {
      return next(Forbidden('PERMISSAO_INSUFICIENTE', 'Permissão insuficiente para esta ação'));
    }
    next();
  };
}
