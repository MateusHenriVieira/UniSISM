import type { Request, Response, NextFunction } from 'express';
import { Unauthorized } from '../../shared/errors';
import type { ITokenService, AccessTokenPayload } from '../../domain/services/ITokenService';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AccessTokenPayload;
  }
}

export function makeAuthenticate(tokens: ITokenService) {
  return function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header('authorization') ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m || !m[1]) {
      return next(Unauthorized('TOKEN_AUSENTE', 'Token não enviado'));
    }
    try {
      req.auth = tokens.verificarAccess(m[1]);
      next();
    } catch (err) {
      next(err);
    }
  };
}
