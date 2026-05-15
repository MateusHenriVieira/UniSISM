import type { Request, Response, NextFunction } from 'express';
import { httpDuration, httpTotal } from '../../infrastructure/metrics/prometheus';

/** Normaliza a rota — usa `route.path` quando disponível, fallback pro path bruto. */
function routeLabel(req: Request): string {
  // Em Express 5, req.route só está populado após o matching.
  const base = (req.baseUrl ?? '') + (req.route?.path ?? req.path);
  // Remove IDs UUID / números pra não explodir cardinalidade
  return base
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:n');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const durSec = Number(process.hrtime.bigint() - inicio) / 1e9;
    const labels = {
      route: routeLabel(req),
      method: req.method,
      status: String(res.statusCode),
    };
    httpDuration.observe(labels, durSec);
    httpTotal.inc(labels);
  });
  next();
}
