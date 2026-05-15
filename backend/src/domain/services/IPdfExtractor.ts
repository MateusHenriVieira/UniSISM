import type { ExtracaoPdfResultado } from '../entities/Encaminhamento';

export interface IPdfExtractor {
  extrair(buffer: Buffer): Promise<ExtracaoPdfResultado>;
}
