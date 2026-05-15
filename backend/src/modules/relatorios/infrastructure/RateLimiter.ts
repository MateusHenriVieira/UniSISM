/**
 * Rate limiter específico para relatórios (§9 da spec LGPD).
 *
 * Limites aplicados:
 *   - 10 POSTs/hora/usuário
 *   - 30 POSTs/dia/usuário
 *   - 3 gerações simultâneas por prefeitura
 *
 * Implementação via Redis (INCR+EXPIRE). Se Redis não estiver ativo,
 * cai para um fallback in-memory que só vale para o processo atual
 * (não é seguro em cluster mas evita falha no dev).
 */
import { prisma } from '../../../infrastructure/database/prisma';
import { getCache } from '../../../infrastructure/cache/Cache';
import { TooManyRequests } from '../../../shared/errors';

export interface LimiteConfig {
  porUsuarioHora: number;
  porUsuarioDia: number;
  simultaneosPorPrefeitura: number;
}

export const LIMITES_PADRAO: LimiteConfig = {
  porUsuarioHora: 10,
  porUsuarioDia: 30,
  simultaneosPorPrefeitura: 3,
};

const localCounters = new Map<string, { v: number; expiraEm: number }>();

async function incrComTtl(chave: string, ttlSeconds: number): Promise<number> {
  const cache = getCache();
  if (cache.isReady()) {
    // ioredis não expõe INCR tipado no nosso wrapper — usamos set-if-absent + get
    const atual = await cache.get<number>(chave);
    const novo = (atual ?? 0) + 1;
    await cache.set(chave, novo, ttlSeconds);
    return novo;
  }
  // Fallback in-memory
  const now = Date.now();
  const slot = localCounters.get(chave);
  if (slot && slot.expiraEm > now) {
    slot.v += 1;
    return slot.v;
  }
  const novo = { v: 1, expiraEm: now + ttlSeconds * 1000 };
  localCounters.set(chave, novo);
  return 1;
}

export class RelatorioRateLimiter {
  constructor(private readonly cfg: LimiteConfig = LIMITES_PADRAO) {}

  async consumir(atendenteId: string, prefeituraId: string): Promise<void> {
    const horaKey = `rl:rel:u:${atendenteId}:h`;
    const diaKey = `rl:rel:u:${atendenteId}:d`;

    const countHora = await incrComTtl(horaKey, 3600);
    if (countHora > this.cfg.porUsuarioHora) {
      throw TooManyRequests(
        'RATE_LIMIT_EXCEDIDO',
        `Limite de ${this.cfg.porUsuarioHora} relatórios por hora atingido. Tente novamente mais tarde.`,
      );
    }
    const countDia = await incrComTtl(diaKey, 86400);
    if (countDia > this.cfg.porUsuarioDia) {
      throw TooManyRequests(
        'RATE_LIMIT_EXCEDIDO',
        `Limite diário de ${this.cfg.porUsuarioDia} relatórios atingido.`,
      );
    }

    // Simultâneos por prefeitura — via count em DB (mais confiável que Redis)
    const processando = await prisma.relatorio.count({
      where: { prefeituraId, status: 'PROCESSANDO' },
    });
    if (processando >= this.cfg.simultaneosPorPrefeitura) {
      throw TooManyRequests(
        'RATE_LIMIT_EXCEDIDO',
        `Já existem ${processando} relatórios sendo gerados para esta prefeitura. Aguarde um terminar.`,
      );
    }
  }
}
