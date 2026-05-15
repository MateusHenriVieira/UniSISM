export interface ArquivoArmazenado {
  caminho: string; // identificador lógico (ex.: path relativo ou chave S3)
  tamanhoKb: number;
}

export interface IFileStorage {
  salvar(input: {
    nomeOriginal: string;
    mimeType: string;
    buffer: Buffer;
    pasta: string;
  }): Promise<ArquivoArmazenado>;

  caminhoAbsoluto(caminho: string): string;

  /**
   * Devolve um Readable Stream do arquivo. Funciona em qualquer backend
   * (disco ou S3). É a forma correta de entregar download via HTTP — `pipe`
   * direto na response.
   */
  obterStream(caminho: string): Promise<NodeJS.ReadableStream>;
}
