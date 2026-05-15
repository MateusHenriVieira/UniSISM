/**
 * CSV com BOM UTF-8 + header LGPD comentado.
 * Streaming via fast-csv · SHA-256 calculado em paralelo à escrita.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { format } from 'fast-csv';
import type { Renderer } from './types';

const BOM = '\uFEFF';

export class CsvRenderer implements Renderer {
  contentType(): string {
    return 'text/csv; charset=utf-8';
  }
  extensao(): string {
    return 'csv';
  }

  async render({
    colunas,
    linhas,
    metadata,
    caminhoDestino,
  }: Parameters<Renderer['render']>[0]): Promise<{ tamanhoBytes: number; sha256: string }> {
    const file = fs.createWriteStream(caminhoDestino);
    const hasher = crypto.createHash('sha256');
    let bytes = 0;

    const escrever = (chunk: string) => {
      const b = Buffer.from(chunk, 'utf8');
      hasher.update(b);
      bytes += b.byteLength;
      file.write(b);
    };

    // Header LGPD comentado (linhas iniciadas com `#` — ignoradas pelo Excel)
    escrever(BOM);
    escrever(`# UNISISM · ${metadata.tipo}\r\n`);
    escrever(`# Título: ${metadata.titulo}\r\n`);
    escrever(`# Período: ${metadata.periodoLegivel}\r\n`);
    escrever(`# Prefeitura: ${metadata.prefeituraNome}\r\n`);
    escrever(`# Gerado por: ${metadata.geradoPorMatricula} (${metadata.geradoPorNomeAbreviado})\r\n`);
    escrever(`# Protocolo: REL-${metadata.relatorioId.slice(0, 8)}\r\n`);
    escrever(`# Gerado em: ${metadata.geradoEmIso}\r\n`);
    escrever(`# Classificação: ${metadata.classificacao}\r\n`);
    escrever(`# Finalidade: ${metadata.finalidade}\r\n`);
    escrever(`# USO INSTITUCIONAL · Lei 13.709/2018 Art. 7º III\r\n`);
    escrever(`\r\n`);

    // Dados via fast-csv (RFC 4180 compliant)
    const csvStream = format({ headers: [...colunas], rowDelimiter: '\r\n', delimiter: ',' });
    csvStream.on('data', (chunk: Buffer) => {
      hasher.update(chunk);
      bytes += chunk.byteLength;
      file.write(chunk);
    });
    for (const linha of linhas) {
      const linhaCsv: Record<string, unknown> = {};
      for (const col of colunas) linhaCsv[col] = linha[col] ?? '';
      csvStream.write(linhaCsv);
    }
    csvStream.end();

    await new Promise<void>((resolve, reject) => {
      csvStream.on('end', resolve);
      csvStream.on('error', reject);
    });

    // Finaliza o file stream
    await new Promise<void>((resolve, reject) => {
      file.end((err: unknown) => (err ? reject(err) : resolve()));
    });

    return { tamanhoBytes: bytes, sha256: hasher.digest('hex') };
  }
}
