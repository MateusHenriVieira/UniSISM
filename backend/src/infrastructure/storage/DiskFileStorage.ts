import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../shared/env';
import { NotFound } from '../../shared/errors';
import type { ArquivoArmazenado, IFileStorage } from '../../domain/services/IFileStorage';

export class DiskFileStorage implements IFileStorage {
  private readonly root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  private async garantirPasta(pasta: string) {
    const abs = path.join(this.root, pasta);
    await fs.mkdir(abs, { recursive: true });
    return abs;
  }

  async salvar(input: {
    nomeOriginal: string;
    mimeType: string;
    buffer: Buffer;
    pasta: string;
  }): Promise<ArquivoArmazenado> {
    const abs = await this.garantirPasta(input.pasta);
    const ext = path.extname(input.nomeOriginal) || '';
    const nomeSeguro = crypto.randomBytes(16).toString('hex') + ext;
    const destino = path.join(abs, nomeSeguro);
    await fs.writeFile(destino, input.buffer);
    return {
      caminho: path.posix.join(input.pasta, nomeSeguro),
      tamanhoKb: Math.max(1, Math.round(input.buffer.byteLength / 1024)),
    };
  }

  caminhoAbsoluto(caminho: string): string {
    return path.join(this.root, caminho);
  }

  async obterStream(caminho: string): Promise<NodeJS.ReadableStream> {
    const abs = this.caminhoAbsoluto(caminho);
    try {
      await fs.access(abs);
    } catch {
      throw NotFound('ARQUIVO_NAO_ENCONTRADO', 'Arquivo físico não encontrado');
    }
    return createReadStream(abs);
  }
}
