"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMetricsUseCase = void 0;
class GetMetricsUseCase {
    encaminhamentos;
    constructor(encaminhamentos) {
        this.encaminhamentos = encaminhamentos;
    }
    exec(ubsId) {
        return this.encaminhamentos.metricas(ubsId);
    }
}
exports.GetMetricsUseCase = GetMetricsUseCase;
//# sourceMappingURL=GetMetricsUseCase.js.map