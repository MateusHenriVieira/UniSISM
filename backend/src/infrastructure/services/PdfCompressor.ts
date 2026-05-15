/**
 * Compressor de PDF com fallback.
 *
 * Estratégia:
 *   1. Tenta Ghostscript (gs) — compressão real, agressiva em imagens.
 *      Níveis: screen (~72dpi, menor) | ebook (~150dpi) | printer (~300dpi).
 *      Para armazenamento usa-se `screen`, que é o mais agressivo sem afetar
 *      legibilidade de texto nativo.
 *   2. Se gs indisponível, fallback para pdf-lib (stripping de metadata +
 *      re-escrita). Economia modesta (~5-15%) mas funciona em qualquer ambiente.
 *
 * A função retorna sempre o menor buffer entre original, gs e pdf-lib.
 * Nunca devolve PDF maior que o original.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';
import { logger } from '../logger';

const execFileAsync = promisify(execFile);

export interface ResultadoCompressao {
  buffer: Buffer;
  bytesOriginais: number;
  bytesFinal: number;
  estrategia: 'ghostscript' | 'pdf-lib' | 'nenhuma';
  razao: number; // 0..1 — quanto menor, mais comprimido (final/original)
}

let gsDisponivel: boolean | null = null;

async function checarGhostscript(): Promise<boolean> {
  if (gsDisponivel !== null) return gsDisponivel;
  try {
    await execFileAsync('gs', ['--version'], { timeout: 3000 });
    gsDisponivel = true;
  } catch {
    gsDisponivel = false;
  }
  logger.info({ gs: gsDisponivel }, 'ghostscript disponível?');
  return gsDisponivel;
}

async function comprimirGhostscript(input: Buffer): Promise<Buffer | null> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'unisism-gs-'));
  const inFile = path.join(dir, 'in.pdf');
  const outFile = path.join(dir, 'out.pdf');
  try {
    await fs.writeFile(inFile, input);
    await execFileAsync(
      'gs',
      [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=/screen', // compressão agressiva
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dSubsetFonts=true',
        '-dColorImageDownsampleType=/Bicubic',
        '-dColorImageResolution=72',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dGrayImageResolution=72',
        '-dMonoImageDownsampleType=/Bicubic',
        '-dMonoImageResolution=150',
        `-sOutputFile=${outFile}`,
        inFile,
      ],
      { timeout: 30_000 },
    );
    return await fs.readFile(outFile);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'gs compress falhou');
    return null;
  } finally {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      /* ignora */
    }
  }
}

async function comprimirPdfLib(input: Buffer): Promise<Buffer | null> {
  try {
    const pdf = await PDFDocument.load(input, { updateMetadata: false });
    // Strip metadata pesado
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setProducer('UNISISM');
    pdf.setCreator('UNISISM');
    // Re-save com object streams ligados
    const saved = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
    return Buffer.from(saved);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'pdf-lib compress falhou');
    return null;
  }
}

export class PdfCompressor {
  async comprimir(input: Buffer): Promise<ResultadoCompressao> {
    const bytesOriginais = input.byteLength;
    const candidatos: Array<{ buffer: Buffer; estrategia: ResultadoCompressao['estrategia'] }> = [
      { buffer: input, estrategia: 'nenhuma' },
    ];

    if (await checarGhostscript()) {
      const gsOut = await comprimirGhostscript(input);
      if (gsOut) candidatos.push({ buffer: gsOut, estrategia: 'ghostscript' });
    }

    const libOut = await comprimirPdfLib(input);
    if (libOut) candidatos.push({ buffer: libOut, estrategia: 'pdf-lib' });

    // Escolhe o menor buffer
    candidatos.sort((a, b) => a.buffer.byteLength - b.buffer.byteLength);
    const vencedor = candidatos[0]!;

    const bytesFinal = vencedor.buffer.byteLength;
    const razao = bytesOriginais > 0 ? bytesFinal / bytesOriginais : 1;

    if (vencedor.estrategia !== 'nenhuma') {
      logger.info(
        {
          estrategia: vencedor.estrategia,
          bytesOriginais,
          bytesFinal,
          reducao: `${Math.round((1 - razao) * 100)}%`,
        },
        'PDF comprimido',
      );
    }

    return {
      buffer: vencedor.buffer,
      bytesOriginais,
      bytesFinal,
      estrategia: vencedor.estrategia,
      razao,
    };
  }
}
