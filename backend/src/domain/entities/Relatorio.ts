export type TipoRelatorio =
  | 'PRODUCAO_INDIVIDUAL'
  | 'ENCAMINHAMENTOS_POR_ESPECIALIDADE'
  | 'FILA_REGULACAO'
  | 'PENDENCIAS_RESOLVIDAS'
  | 'TFD_CUSTOS'
  | 'VACINACAO_UBS'
  | 'BUSCA_ATIVA';

export type FormatoRelatorio = 'PDF' | 'CSV' | 'XLSX';

export type StatusRelatorio = 'DISPONIVEL' | 'PROCESSANDO' | 'FALHA';

export interface Relatorio {
  id: string;
  titulo: string;
  tipo: TipoRelatorio;
  periodo: string;
  formato: FormatoRelatorio;
  geradoEm: string;
  tamanhoKb: number;
  status: StatusRelatorio;
}

export interface GerarRelatorioPayload {
  tipo: TipoRelatorio;
  dataInicial: string;
  dataFinal: string;
  formato: FormatoRelatorio;
  filtros?: Record<string, unknown>;
}
