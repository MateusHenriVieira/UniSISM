/**
 * Download autenticado do relatório (§2 fase 3 da spec).
 *
 * Guard de visibilidade:
 *   - Apenas DISPONIVEL, não-expirado
 *   - SELECT:
 *     · gerado_por = :atendenteId
 *       OU
 *     · (role=ADMIN|DESENVOLVEDOR AND prefeitura_id = :self.prefeituraId)
 *     · DESENVOLVEDOR: sem filtro de prefeitura
 *   - Se não bater: 404 (nunca 403, para não vazar existência)
 *
 * Efeito colateral:
 *   - INCREMENTA downloads + atualiza ultimoDownload
 *   - AUDIT log (atendenteId + ip + user-agent)
 */
import { Conflict, NotFound } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { IFileStorage } from '../../../domain/services/IFileStorage';
import { RelatorioAuditLogger } from '../infrastructure/RelatorioAuditLogger';

export interface DownloadInput {
  relatorioId: string;
  atendenteId: string;
  role: string;
  scope: AccessScope;
  ip?: string | null;
  userAgent?: string | null;
}

export interface DownloadOutput {
  caminhoAbsoluto: string; // path em disco (DiskFileStorage) ou s3:// (S3FileStorage)
  contentType: string;
  filename: string;
  sha256: string;
}

export class BaixarRelatorioUseCase {
  private readonly audit = new RelatorioAuditLogger();

  constructor(private readonly storage: IFileStorage) {}

  async exec(input: DownloadInput): Promise<DownloadOutput> {
    const job = await prisma.relatorio.findUnique({ where: { id: input.relatorioId } });
    if (!job) throw NotFound('RELATORIO_NAO_ENCONTRADO', 'Relatório não encontrado');

    // Guard de ownership/escopo
    const ehDono = job.atendenteId === input.atendenteId;
    const ehDev = input.role === 'DESENVOLVEDOR';
    const ehAdminDaPref =
      input.role === 'ADMIN' &&
      input.scope.kind === 'PREFEITURA' &&
      input.scope.prefeituraId === job.prefeituraId;
    if (!ehDono && !ehDev && !ehAdminDaPref) {
      throw NotFound('RELATORIO_NAO_ENCONTRADO', 'Relatório não encontrado');
    }

    // Estado
    if (job.status !== 'DISPONIVEL' || !job.storageKey || !job.contentType) {
      throw Conflict('RELATORIO_NAO_DISPONIVEL', 'Relatório ainda não está disponível');
    }
    if (job.expiraEm < new Date()) {
      throw new (await import('../../../shared/errors')).AppError(
        410,
        'RELATORIO_EXPIRADO',
        'Este relatório expirou. Gere novamente.',
      );
    }

    // Incrementa contador + audit
    await prisma.relatorio.update({
      where: { id: job.id },
      data: {
        downloads: { increment: 1 },
        ultimoDownload: new Date(),
      },
    });
    await this.audit.registrar({
      relatorioId: job.id,
      atendenteId: input.atendenteId,
      acao: 'DOWNLOAD',
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });

    const ext = job.formato.toLowerCase();
    const filename = `${job.tipo.toLowerCase().replace(/_/g, '-')}-${job.id.slice(0, 8)}.${ext}`;

    return {
      caminhoAbsoluto: this.storage.caminhoAbsoluto(job.storageKey),
      contentType: job.contentType,
      filename,
      sha256: job.hashSha256 ?? '',
    };
  }
}
