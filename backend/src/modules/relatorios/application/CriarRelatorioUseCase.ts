/**
 * CriarRelatorioUseCase — entrada do pipeline.
 *
 * Responsabilidades:
 *   1. Validação de input (período, formato, nominal opt-in)
 *   2. Guard de permissão (role × tipo)
 *   3. Rate limit
 *   4. Snapshot de escopo RBAC (prefeituraId, ubsId) derivado do JWT
 *   5. INSERT RelatorioJob em PROCESSANDO
 *   6. Audit CRIADO
 *   7. Dispara worker (fire-and-forget — em produção: BullMQ)
 */
import { BadRequest, Forbidden, NotFound, Unprocessable } from '../../../shared/errors';
import type { AccessScope } from '../../../shared/scope';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../infrastructure/logger';
import type {
  FormatoRelatorio,
  Relatorio,
  TipoRelatorio,
} from '../../../domain/entities/Relatorio';
import { META, podeGerar } from '../domain/TipoRelatorioMeta';
import { RelatorioRateLimiter } from '../infrastructure/RateLimiter';
import { RelatorioAuditLogger } from '../infrastructure/RelatorioAuditLogger';
import type { RelatorioWorker } from './RelatorioWorker';

const MAX_DIAS_PERIODO = 366; // ≤ 12 meses
const FORMATOS_VALIDOS: FormatoRelatorio[] = ['PDF', 'CSV', 'XLSX'];
const TIPOS_VALIDOS: TipoRelatorio[] = Object.keys(META) as TipoRelatorio[];

export interface CriarRelatorioInput {
  tipo: TipoRelatorio;
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string;
  formato: FormatoRelatorio;
  filtros?: Record<string, unknown>;
}

export interface SolicitanteCtx {
  atendenteId: string;
  role: string;
  scope: AccessScope;
  nome: string;
  matricula: string;
  ip?: string | null;
  userAgent?: string | null;
}

function fmtBr(d: Date): string {
  return d.toLocaleDateString('pt-BR');
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class CriarRelatorioUseCase {
  private readonly rateLimiter = new RelatorioRateLimiter();
  private readonly audit = new RelatorioAuditLogger();

  constructor(private readonly worker: RelatorioWorker) {}

  async exec(solicitante: SolicitanteCtx, input: CriarRelatorioInput): Promise<Relatorio> {
    // ---- 1. Validação estrutural ----
    if (!TIPOS_VALIDOS.includes(input.tipo)) {
      throw BadRequest('TIPO_RELATORIO_INVALIDO', `Tipo "${input.tipo}" não é suportado`);
    }
    if (!FORMATOS_VALIDOS.includes(input.formato)) {
      throw BadRequest('FORMATO_INVALIDO', `Formato "${input.formato}" não é suportado`);
    }

    const ini = parseYmd(input.dataInicial);
    const fim = parseYmd(input.dataFinal);
    if (!ini || !fim) {
      throw BadRequest('PERIODO_INVALIDO', 'Datas devem estar no formato YYYY-MM-DD');
    }
    if (ini > fim) {
      throw BadRequest('PERIODO_INVALIDO', 'dataInicial não pode ser maior que dataFinal');
    }
    const hojeFim = new Date();
    hojeFim.setUTCHours(23, 59, 59, 999);
    if (fim > hojeFim) {
      throw BadRequest('PERIODO_INVALIDO', 'dataFinal não pode ser futura');
    }
    const diffDias = Math.ceil((fim.getTime() - ini.getTime()) / 86_400_000);
    if (diffDias > MAX_DIAS_PERIODO) {
      throw BadRequest(
        'PERIODO_INVALIDO',
        `Período máximo: ${MAX_DIAS_PERIODO} dias. Solicitado: ${diffDias} dias.`,
      );
    }

    // ---- 2. Permissão ----
    if (!podeGerar(solicitante.role as never, input.tipo)) {
      throw Forbidden(
        'PERMISSAO_INSUFICIENTE',
        `Você não tem permissão para gerar relatórios do tipo "${input.tipo}".`,
      );
    }

    // Nominal opt-in (só em BUSCA_ATIVA)
    const meta = META[input.tipo];
    const filtros = input.filtros ?? {};
    if (filtros['incluirNomes'] === true) {
      if (!meta.permiteNominal) {
        throw Unprocessable(
          'NOMINAL_NAO_PERMITIDO',
          `Tipo "${input.tipo}" não suporta modo nominal.`,
        );
      }
      if (!['COORDENADOR_UBS', 'ADMIN', 'DESENVOLVEDOR'].includes(solicitante.role)) {
        throw Forbidden('PERMISSAO_INSUFICIENTE', 'Modo nominal restrito a coordenadores/admin.');
      }
      const just = typeof filtros['justificativa'] === 'string' ? (filtros['justificativa'] as string) : '';
      if (just.trim().length < 30) {
        throw Unprocessable(
          'JUSTIFICATIVA_OBRIGATORIA',
          'Modo nominal exige justificativa de no mínimo 30 caracteres.',
        );
      }
    }

    // ---- 3. Resolver escopo de dados a partir do JWT ----
    const escopo = solicitante.scope;
    let prefeituraId: string | null = null;
    let ubsId: string | null = null;
    if (escopo.kind === 'GLOBAL') {
      // Desenvolvedor precisa escolher a prefeitura; se não vier, recusa.
      prefeituraId = (filtros['prefeituraId'] as string | undefined) ?? null;
      if (!prefeituraId) {
        throw Unprocessable(
          'PREFEITURA_OBRIGATORIA',
          'DESENVOLVEDOR deve informar filtros.prefeituraId para gerar relatórios.',
        );
      }
      ubsId = (filtros['ubsId'] as string | undefined) ?? null;
    } else if (escopo.kind === 'PREFEITURA') {
      prefeituraId = escopo.prefeituraId;
      // ADMIN/REGULADOR podem filtrar por UBS específica
      ubsId = (filtros['ubsId'] as string | undefined) ?? null;
    } else {
      // UBS — força seu próprio escopo
      prefeituraId = escopo.prefeituraId ?? null;
      ubsId = escopo.ubsId;
      if (!prefeituraId) {
        // Recarrega da UBS
        const ubs = await prisma.ubs.findUnique({
          where: { id: escopo.ubsId },
          select: { prefeituraId: true },
        });
        if (!ubs) throw NotFound('UBS_NAO_ENCONTRADA', 'UBS do escopo não encontrada');
        prefeituraId = ubs.prefeituraId;
      }
    }

    // ---- 4. Rate limit ----
    await this.rateLimiter.consumir(solicitante.atendenteId, prefeituraId);

    // ---- 5. INSERT job ----
    const periodoLegivel = `${fmtBr(ini)} – ${fmtBr(fim)}`;
    const titulo = meta.tituloTemplate(periodoLegivel) + (filtros['incluirNomes'] === true ? ' (NOMINAL)' : '');

    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Sanitiza filtros de audit (remove PII potencial)
    const filtrosAudit: Record<string, unknown> = { ...filtros };
    if ('justificativa' in filtrosAudit && typeof filtrosAudit['justificativa'] === 'string') {
      filtrosAudit['justificativa'] = String(filtrosAudit['justificativa']).slice(0, 500);
    }

    const job = await prisma.relatorio.create({
      data: {
        tipo: input.tipo,
        titulo,
        periodoIni: ini,
        periodoFim: fim,
        formato: input.formato,
        status: 'PROCESSANDO',
        filtros: filtrosAudit as import('../../../../generated/prisma').Prisma.InputJsonValue,
        atendenteId: solicitante.atendenteId,
        prefeituraId,
        ubsId,
        expiraEm,
      },
    });

    // ---- 6. Audit CRIADO ----
    await this.audit.registrar({
      relatorioId: job.id,
      atendenteId: solicitante.atendenteId,
      acao: 'CRIADO',
      ip: solicitante.ip ?? null,
      userAgent: solicitante.userAgent ?? null,
      detalhes: {
        tipo: input.tipo,
        formato: input.formato,
        periodoIni: ini.toISOString(),
        periodoFim: fim.toISOString(),
        escopo: { prefeituraId, ubsId },
        nominal: filtros['incluirNomes'] === true,
      },
    });

    // ---- 7. Dispara worker (fire-and-forget — em produção: fila) ----
    void this.worker.executar(job.id).catch((err) =>
      logger.error({ err, jobId: job.id }, 'worker explodiu fora do catch interno'),
    );

    // Shape esperado pelo frontend (Relatorio)
    return {
      id: job.id,
      titulo: job.titulo,
      tipo: job.tipo,
      periodo: periodoLegivel,
      formato: job.formato,
      geradoEm: job.geradoEm.toISOString(),
      tamanhoKb: 0,
      status: 'PROCESSANDO',
    };
  }
}
