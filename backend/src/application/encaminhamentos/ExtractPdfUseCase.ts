import type { ExtracaoPdfResultado } from '../../domain/entities/Encaminhamento';
import type { IPdfExtractor } from '../../domain/services/IPdfExtractor';

export class ExtractPdfUseCase {
  constructor(private readonly extractor: IPdfExtractor) {}

  exec(buffer: Buffer): Promise<ExtracaoPdfResultado> {
    return this.extractor.extrair(buffer);
  }
}
