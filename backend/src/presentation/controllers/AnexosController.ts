/**
 * Controller de anexos (Face 2 · SMS).
 *
 * Hoje só expõe `GET /v1/anexos/:id/download`. Headers seguem a spec do
 * frontend (`AnexoActions.svelte`):
 *   - Content-Type real do arquivo (PDF/JPEG/PNG, NÃO `octet-stream`).
 *   - Content-Disposition `inline; filename="..."` — permite preview em iframe.
 *   - Cache-Control `private, max-age=0, must-revalidate` — evita cache em proxies.
 */
import type { Request, Response } from 'express';
import { paramString } from '../../shared/http';
import { scopeFromRequest } from '../../shared/requestScope';
import type { GetDownloadAnexoUseCase } from '../../application/anexos/GetDownloadAnexoUseCase';

function sanitizarFilename(nome: string): string {
  // Remove caracteres que quebram Content-Disposition (aspas, controle, CR/LF).
  return nome.replace(/[\r\n"\\]/g, '_');
}

export class AnexosController {
  constructor(private readonly downloadUC: GetDownloadAnexoUseCase) {}

  getDownload = async (req: Request, res: Response): Promise<void> => {
    const id = paramString(req, 'id');
    const scope = scopeFromRequest(req);
    const arq = await this.downloadUC.exec(id, scope);

    res.set('Content-Type', arq.mimeType);
    res.set(
      'Content-Disposition',
      `inline; filename="${sanitizarFilename(arq.nome)}"`,
    );
    res.set('Cache-Control', 'private, max-age=0, must-revalidate');
    res.set('X-Content-Type-Options', 'nosniff');
    arq.stream.pipe(res);
  };
}
