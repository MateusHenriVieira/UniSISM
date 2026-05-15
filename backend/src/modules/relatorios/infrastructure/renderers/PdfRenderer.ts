/**
 * PDF via pdfkit.
 *  - cabeçalho em todas as páginas
 *  - rodapé LGPD
 *  - marca d'água diagonal "CONFIDENCIAL" quando classificação é sensível
 *  - tabela simples de dados com quebra automática
 *  - numeração de linha por página
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import type { Renderer } from './types';

const CABECALHO_H = 50;
const RODAPE_H = 40;

export class PdfRenderer implements Renderer {
  contentType(): string {
    return 'application/pdf';
  }
  extensao(): string {
    return 'pdf';
  }

  async render({
    colunas,
    linhas,
    metadata,
    caminhoDestino,
  }: Parameters<Renderer['render']>[0]): Promise<{ tamanhoBytes: number; sha256: string }> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 70, bottom: 60, left: 40, right: 40 },
      info: {
        Title: metadata.titulo,
        Author: `UNISISM · ${metadata.geradoPorMatricula}`,
        Subject: metadata.tipo,
        Keywords: `LGPD, ${metadata.tipo}, ${metadata.prefeituraNome}`,
        Producer: 'UNISISM',
        Creator: 'UNISISM',
      },
    });

    const file = fs.createWriteStream(caminhoDestino);
    const hasher = crypto.createHash('sha256');
    let bytes = 0;

    doc.on('data', (chunk: Buffer) => {
      hasher.update(chunk);
      bytes += chunk.byteLength;
    });
    doc.pipe(file);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const innerWidth = pageWidth - 40 - 40;

    // Cabeçalho / rodapé são redesenhados em toda página nova
    const desenharMoldura = () => {
      // Cabeçalho
      doc.save();
      doc.fontSize(10).fillColor('#111').font('Helvetica-Bold');
      doc.text(`UNISISM · ${metadata.prefeituraNome}`, 40, 25, { width: innerWidth });
      doc.font('Helvetica').fontSize(9).fillColor('#444');
      doc.text(metadata.titulo, 40, 40, { width: innerWidth });
      doc.text(`Período: ${metadata.periodoLegivel}`, 40, 52, { width: innerWidth });
      doc.moveTo(40, 66).lineTo(pageWidth - 40, 66).strokeColor('#ccc').stroke();
      doc.restore();

      // Rodapé
      doc.save();
      doc.fontSize(8).fillColor('#555').font('Helvetica');
      const protocolo = `Protocolo REL-${metadata.relatorioId.slice(0, 8)}`;
      const autoria = `Gerado por: ${metadata.geradoPorMatricula} em ${metadata.geradoEmIso}`;
      const lgpd = 'USO INSTITUCIONAL · Lei 13.709/2018 Art. 7º III';
      doc.text(protocolo, 40, pageHeight - 45, { width: innerWidth, align: 'left' });
      doc.text(autoria, 40, pageHeight - 45, { width: innerWidth, align: 'right' });
      doc.text(lgpd, 40, pageHeight - 30, { width: innerWidth, align: 'center' });
      doc.restore();

      // Marca d'água (se confidencial)
      if (metadata.marcaDagua) {
        doc.save();
        doc.rotate(-30, { origin: [pageWidth / 2, pageHeight / 2] });
        doc.opacity(0.08).fillColor('#c00').font('Helvetica-Bold').fontSize(120);
        doc.text('CONFIDENCIAL', 0, pageHeight / 2 - 60, { width: pageWidth, align: 'center' });
        doc.opacity(1);
        doc.restore();
      }
    };

    // Flag de reentrância: desenharMoldura chama doc.text(), que pode
    // acidentalmente disparar pageAdded novamente → stack overflow.
    let desenhando = false;
    const safeDesenhar = () => {
      if (desenhando) return;
      desenhando = true;
      try {
        desenharMoldura();
      } finally {
        desenhando = false;
      }
    };
    doc.on('pageAdded', safeDesenhar);
    safeDesenhar();

    // ---- Tabela de dados ----
    doc.fontSize(9).fillColor('#000').font('Helvetica-Bold');
    let y = CABECALHO_H + 30;
    const xInicio = 40;
    const colWidth = innerWidth / colunas.length;

    // Cabeçalho de colunas
    const desenharHeaderTabela = () => {
      doc.save();
      doc.rect(xInicio, y, innerWidth, 18).fill('#e5e7eb');
      doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
      let x = xInicio + 4;
      for (const c of colunas) {
        doc.text(c, x, y + 5, { width: colWidth - 8, ellipsis: true });
        x += colWidth;
      }
      doc.restore();
      y += 20;
    };
    desenharHeaderTabela();

    doc.font('Helvetica').fontSize(8).fillColor('#000');
    let numLinha = 0;
    for (const linha of linhas) {
      numLinha++;
      if (y > pageHeight - RODAPE_H - 30) {
        doc.addPage();
        y = CABECALHO_H + 30;
        desenharHeaderTabela();
      }
      let x = xInicio + 4;
      for (const c of colunas) {
        const v = linha[c];
        const s = v === null || v === undefined ? '' : String(v);
        doc.text(s, x, y + 3, { width: colWidth - 8, ellipsis: true });
        x += colWidth;
      }
      doc.moveTo(xInicio, y + 15).lineTo(xInicio + innerWidth, y + 15).strokeColor('#eee').stroke();
      y += 16;
    }

    if (linhas.length === 0) {
      doc.fontSize(10).fillColor('#888').font('Helvetica-Oblique');
      doc.text('Nenhum dado para o período selecionado.', xInicio, y + 10, {
        width: innerWidth,
        align: 'center',
      });
    } else {
      y += 8;
      doc.fontSize(8).fillColor('#555').font('Helvetica');
      doc.text(`Total de registros: ${numLinha}`, xInicio, y, { width: innerWidth });
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      file.on('finish', resolve);
      file.on('error', reject);
    });

    return { tamanhoBytes: bytes, sha256: hasher.digest('hex') };
  }
}
