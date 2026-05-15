import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    // Log explícito das issues pra facilitar debug no terminal do backend.
    logger.warn(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        issues: err.issues.map((i) => ({
          path: i.path.join('.'),
          code: i.code,
          message: i.message,
        })),
      },
      'payload rejeitado pelo zod (400 PAYLOAD_INVALIDO)',
    );
    res.status(400).json({
      error: {
        code: 'PAYLOAD_INVALIDO',
        message: 'Payload inválido',
        details: { issues: err.issues },
      },
    });
    return;
  }

  // Multer
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: { code: 'ARQUIVO_MUITO_GRANDE', message: 'Arquivo excede o limite' },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'erro não tratado');
  res.status(500).json({
    error: { code: 'ERRO_INTERNO', message: 'Erro interno do servidor' },
  });
};
