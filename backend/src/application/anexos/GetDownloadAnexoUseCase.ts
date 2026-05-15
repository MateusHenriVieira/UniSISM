/**
 * Download de anexo de encaminhamento (Face 2 · SMS).
 *
 * Regras:
 *   - Anexo não existe ou de outra prefeitura → 404 ANEXO_NAO_ENCONTRADO.
 *   - `scanStatus != LIMPO` → 409 ANEXO_NAO_LIBERADO.
 *   - Pertencimento à prefeitura via `encaminhamento.ubs.prefeituraId`
 *     (multi-tenancy igual ao resto da Face 2).
 *
 * O use case devolve metadados + um Readable stream — o controller faz
 * `pipe(res)` com headers `inline + Cache-Control: private, no-cache`.
 */
import { Conflict, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import type { IFileStorage } from '../../domain/services/IFileStorage';
import type { AccessScope } from '../../shared/scope';

export interface AnexoDownload {
  nome: string;
  mimeType: string;
  tamanhoKb: number;
  stream: NodeJS.ReadableStream;
}

export class GetDownloadAnexoUseCase {
  constructor(private readonly storage: IFileStorage) {}

  async exec(anexoId: string, scope: AccessScope): Promise<AnexoDownload> {
    const anexo = await prisma.anexoDocumento.findUnique({
      where: { id: anexoId },
      include: {
        encaminhamento: {
          select: { id: true, ubs: { select: { prefeituraId: true } } },
        },
      },
    });
    if (!anexo) {
      throw NotFound('ANEXO_NAO_ENCONTRADO', 'Anexo não encontrado');
    }

    // Multi-tenancy: GLOBAL (DEV) vê tudo; demais checam prefeitura.
    if (scope.kind !== 'GLOBAL') {
      const prefeituraDoAnexo = anexo.encaminhamento.ubs.prefeituraId;
      if (scope.prefeituraId !== prefeituraDoAnexo) {
        throw NotFound('ANEXO_NAO_ENCONTRADO', 'Anexo não encontrado');
      }
    }

    if (anexo.scanStatus !== 'LIMPO') {
      throw Conflict(
        'ANEXO_NAO_LIBERADO',
        'Arquivo ainda em processamento ou bloqueado por segurança',
        { scanStatus: anexo.scanStatus },
      );
    }

    const stream = await this.storage.obterStream(anexo.caminho);
    return {
      nome: anexo.nome,
      mimeType: anexo.mimeType,
      tamanhoKb: anexo.tamanhoKb,
      stream,
    };
  }
}
