/**
 * Middleware de idempotência (TFD §9.8).
 *
 * Quando o cliente envia `X-Idempotency-Key` num POST/PATCH/DELETE, gravamos
 * a resposta (status + JSON) por 24h e replicamos respostas idênticas pra
 * chamadas subsequentes com a mesma chave + mesma rota + mesmo operador.
 *
 * Aplicar APENAS em endpoints onde repetição causaria efeito colateral
 * indesejado: aportar saldo, pagar ajuda de custo, registrar comprovante.
 *
 * Limites:
 *   - Só intercepta `res.json(...)`. Outros caminhos (res.send com binário,
 *     stream) passam direto, sem cache.
 *   - Tamanho do JSON limitado pelo banco (TEXT). Respostas TFD são pequenas.
 *   - Garbage collection: feita lazy nas próprias requests; o overhead é
 *     desprezível (delete de no-op se não houver registros expirados).
 *   - Requer `req.auth.sub`. Usar SEMPRE depois de `authenticate`.
 */
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { logger } from '../../infrastructure/logger';

const TTL_HORAS = 24;

function chave(operadorId: string, key: string, method: string, path: string): string {
  return crypto
    .createHash('sha256')
    .update(`${operadorId}|${key}|${method}|${path}`, 'utf8')
    .digest('hex');
}

let ultimoGcMs = 0;
const GC_INTERVALO_MS = 5 * 60 * 1000;

async function gcSeNecessario(): Promise<void> {
  const agora = Date.now();
  if (agora - ultimoGcMs < GC_INTERVALO_MS) return;
  ultimoGcMs = agora;
  try {
    const r = await prisma.tfdIdempotencyKey.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
    if (r.count > 0) {
      logger.debug({ apagados: r.count }, 'idempotency: gc');
    }
  } catch (err) {
    logger.warn({ err }, 'idempotency: gc falhou');
  }
}

export async function idempotency(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const headerKey = req.header('x-idempotency-key');
  if (!headerKey) return next();
  const operadorId = req.auth?.sub;
  if (!operadorId) return next();

  void gcSeNecessario();

  const hash = chave(operadorId, headerKey, req.method, req.originalUrl.split('?')[0] ?? req.path);

  try {
    const cached = await prisma.tfdIdempotencyKey.findUnique({ where: { hash } });
    if (cached && cached.expiraEm > new Date()) {
      res.status(cached.statusCode).json(cached.responseJson);
      return;
    }
  } catch (err) {
    logger.warn({ err }, 'idempotency: leitura falhou — passando direto');
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const status = res.statusCode || 200;
    if (status >= 200 && status < 300) {
      const expiraEm = new Date(Date.now() + TTL_HORAS * 60 * 60 * 1000);
      prisma.tfdIdempotencyKey
        .create({
          data: {
            hash,
            operadorId,
            method: req.method,
            path: req.originalUrl.split('?')[0] ?? req.path,
            statusCode: status,
            responseJson: body as Parameters<typeof prisma.tfdIdempotencyKey.create>[0]['data']['responseJson'],
            expiraEm,
          },
        })
        .catch((err: unknown) => {
          // P2002 = unique violation → segunda request paralela com mesma key;
          // a versão cacheada será usada na próxima leitura. Ignoramos.
          const code = (err as { code?: string }).code;
          if (code !== 'P2002') {
            logger.warn({ err }, 'idempotency: gravação falhou');
          }
        });
    }
    return originalJson(body);
  };

  next();
}
