import pino from 'pino';
import { env } from '../shared/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'unisism-ubs-backend' },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
