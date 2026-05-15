/**
 * XLSX via exceljs (streaming WorkbookWriter).
 * Aba "Dados" com colunas + freeze pane na linha 1.
 * Aba "Metadados" key-value (conformidade LGPD, hash, autor).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import type { Renderer } from './types';

export class XlsxRenderer implements Renderer {
  contentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  extensao(): string {
    return 'xlsx';
  }

  async render({
    colunas,
    linhas,
    metadata,
    caminhoDestino,
  }: Parameters<Renderer['render']>[0]): Promise<{ tamanhoBytes: number; sha256: string }> {
    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: caminhoDestino,
      useStyles: true,
      useSharedStrings: false,
    });
    wb.creator = 'UNISISM';
    wb.created = new Date(metadata.geradoEmIso);

    // ---- Aba 1: Dados ----
    const dados = wb.addWorksheet('Dados', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    dados.columns = [...colunas].map((c) => ({
      header: c,
      key: c,
      width: Math.min(Math.max(c.length + 2, 14), 40),
    }));
    dados.getRow(1).font = { bold: true };
    dados.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    for (const linha of linhas) {
      dados.addRow(linha).commit();
    }
    dados.commit();

    // ---- Aba 2: Metadados ----
    const meta = wb.addWorksheet('Metadados');
    meta.columns = [
      { header: 'Campo', key: 'k', width: 28 },
      { header: 'Valor', key: 'v', width: 80 },
    ];
    meta.getRow(1).font = { bold: true };

    const linhasMeta: Array<{ k: string; v: string }> = [
      { k: 'Título', v: metadata.titulo },
      { k: 'Tipo', v: metadata.tipo },
      { k: 'Período', v: metadata.periodoLegivel },
      { k: 'Prefeitura', v: metadata.prefeituraNome },
      { k: 'Gerado por', v: `${metadata.geradoPorMatricula} (${metadata.geradoPorNomeAbreviado})` },
      { k: 'Protocolo', v: `REL-${metadata.relatorioId.slice(0, 8)}` },
      { k: 'Gerado em', v: metadata.geradoEmIso },
      { k: 'Classificação', v: metadata.classificacao },
      { k: 'Finalidade', v: metadata.finalidade },
      { k: 'Base legal', v: 'Lei 13.709/2018 Art. 7º III (LGPD) — política pública de saúde' },
      { k: 'Uso', v: 'INSTITUCIONAL — proibida distribuição fora do contexto institucional' },
    ];
    for (const r of linhasMeta) meta.addRow(r).commit();
    meta.commit();

    await wb.commit();

    // Calcula hash + tamanho após fechar o workbook
    const conteudo = await fs.promises.readFile(caminhoDestino);
    const sha256 = crypto.createHash('sha256').update(conteudo).digest('hex');
    return { tamanhoBytes: conteudo.byteLength, sha256 };
  }
}
