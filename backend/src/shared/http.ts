import type { Request } from 'express';

/**
 * Extrai param de rota como string. Express 5 tipa `req.params[k]` como
 * `string | string[]` (catch-all wildcards retornam array). Para nossas rotas
 * `:id` o valor é sempre string — coerce aqui para silenciar o TS.
 */
export function paramString(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}
