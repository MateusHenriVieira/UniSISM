"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractPdfUseCase = void 0;
class ExtractPdfUseCase {
    extractor;
    constructor(extractor) {
        this.extractor = extractor;
    }
    exec(buffer) {
        return this.extractor.extrair(buffer);
    }
}
exports.ExtractPdfUseCase = ExtractPdfUseCase;
//# sourceMappingURL=ExtractPdfUseCase.js.map