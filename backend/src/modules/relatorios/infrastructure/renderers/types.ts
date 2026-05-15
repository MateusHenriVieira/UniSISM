import type { LinhaDados } from '../../application/dataSources';

export interface RenderMetadata {
  titulo: string;          // "Fila de Regulação · Abr/2026"
  tipo: string;            // TipoRelatorio como string
  periodoLegivel: string;  // "01/04/2026 – 22/04/2026"
  prefeituraNome: string;
  geradoPorMatricula: string;
  geradoPorNomeAbreviado: string;
  relatorioId: string;     // será usado como protocolo no header
  geradoEmIso: string;
  finalidade: string;      // descrição LGPD
  classificacao: 'PUBLICO_INSTITUCIONAL' | 'USO_INTERNO' | 'RESTRITO' | 'CONFIDENCIAL';
  marcaDagua: boolean;
}

export interface Renderer {
  contentType(): string;
  extensao(): string;
  /**
   * Renderiza os dados em um arquivo no disco. Deve calcular o hash SHA-256
   * do conteúdo gerado enquanto escreve (streaming).
   */
  render(params: {
    colunas: readonly string[];
    linhas: LinhaDados[];
    metadata: RenderMetadata;
    caminhoDestino: string;
  }): Promise<{ tamanhoBytes: number; sha256: string }>;
}
