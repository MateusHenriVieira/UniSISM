"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEncaminhamentoUseCase = void 0;
const errors_1 = require("../../shared/errors");
class GetEncaminhamentoUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async exec(id, ubsId) {
        const e = await this.repo.buscarPorId(id, ubsId);
        if (!e)
            throw (0, errors_1.NotFound)('ENCAMINHAMENTO_NAO_ENCONTRADO', 'Encaminhamento não encontrado');
        return e;
    }
}
exports.GetEncaminhamentoUseCase = GetEncaminhamentoUseCase;
//# sourceMappingURL=GetEncaminhamentoUseCase.js.map