/**
 * Métricas Prometheus.
 *
 * Expõe um Registry global + conjunto de métricas nomeadas conforme
 * convenção OpenMetrics (nome_snake_case, unidade no sufixo).
 */
import client from 'prom-client';

const register = new client.Registry();
register.setDefaultLabels({ service: 'unisism-ubs-backend' });
client.collectDefaultMetrics({ register });

export const metricsRegistry = register;

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['route', 'method', 'status'] as const,
  buckets: [0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['route', 'method', 'status'] as const,
  registers: [register],
});

export const encaminhamentosTotal = new client.Counter({
  name: 'encaminhamentos_total',
  help: 'Total de encaminhamentos criados',
  labelNames: ['prefeitura', 'status'] as const,
  registers: [register],
});

export const encaminhamentoTransicao = new client.Counter({
  name: 'encaminhamento_transicao_total',
  help: 'Transições de estado de encaminhamentos',
  labelNames: ['de', 'para'] as const,
  registers: [register],
});

export const ocrDuration = new client.Histogram({
  name: 'ocr_extraction_duration_seconds',
  help: 'Duração da extração OCR/texto de PDF',
  labelNames: ['origem'] as const,
  buckets: [0.5, 1, 2, 5, 10, 15, 30],
  registers: [register],
});

export const ocrConfidence = new client.Histogram({
  name: 'ocr_extraction_confidence',
  help: 'Distribuição da confiança da extração (0..1)',
  buckets: [0.25, 0.5, 0.75, 0.85, 0.95, 0.99],
  registers: [register],
});

export const avScanDuration = new client.Histogram({
  name: 'av_scan_duration_seconds',
  help: 'Duração do scan de antivírus por arquivo',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const avScanInfectados = new client.Counter({
  name: 'av_scan_infectados_total',
  help: 'Total de arquivos marcados como infectados',
  registers: [register],
});

export const outboxPendentes = new client.Gauge({
  name: 'outbox_pendentes',
  help: 'Eventos outbox aguardando publicação',
  registers: [register],
});

export const authLoginTotal = new client.Counter({
  name: 'auth_login_total',
  help: 'Tentativas de login',
  labelNames: ['resultado'] as const, // sucesso | falha | bloqueado
  registers: [register],
});

export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Cache hits',
  labelNames: ['namespace'] as const,
  registers: [register],
});
export const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Cache misses',
  labelNames: ['namespace'] as const,
  registers: [register],
});
