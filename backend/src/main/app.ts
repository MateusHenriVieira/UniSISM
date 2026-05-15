import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '../shared/env';
import { requestId } from '../presentation/middlewares/requestId';
import { errorHandler } from '../presentation/middlewares/errorHandler';
import { metricsMiddleware } from '../presentation/middlewares/metrics';
import { buildRoutes } from '../presentation/routes';
import { buildContainer, type Container } from './container';
import { metricsRegistry } from '../infrastructure/metrics/prometheus';

export interface BuiltApp {
  app: Express;
  container: Container;
}

export function buildApp(): BuiltApp {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      // Lista de origens explícitas + callback pra aceitar:
      //  - requests sem Origin (apps mobile nativos com http package/dio não mandam Origin)
      //  - qualquer IP da LAN em dev (Flutter em device físico)
      origin: (origin, cb) => {
        const allow = env.CORS_ORIGIN.split(',').map((s) => s.trim());
        if (!origin) return cb(null, true); // apps mobile
        if (allow.includes(origin)) return cb(null, true);
        if (allow.includes('*')) return cb(null, true);
        if (env.NODE_ENV === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
          return cb(null, true);
        }
        cb(new Error(`CORS: origin não permitida: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestId);
  app.use(metricsMiddleware);
  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
      skip: (req) => req.path === '/v1/health' || req.path === '/metrics',
    }),
  );

  const container = buildContainer();
  app.use('/v1', buildRoutes(container));

  // Endpoint Prometheus — interno, sem auth. Em produção, restringir por NetworkPolicy/firewall.
  if ((process.env['METRICS_ENABLED'] ?? 'true') === 'true') {
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });
  }

  app.use(errorHandler);

  return { app, container };
}
