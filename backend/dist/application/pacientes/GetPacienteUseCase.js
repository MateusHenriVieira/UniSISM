"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPacienteUseCase = void 0;
const errors_1 = require("../../shared/errors");
class GetPacienteUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async exec(id, ubsId) {
        const p = await this.repo.buscarPorId(id, ubsId);
        if (!p)
            throw (0, errors_1.NotFound)('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
        return p;
    }
}
exports.GetPacienteUseCase = GetPacienteUseCase;
//# sourceMappingURL=GetPacienteUseCase.js.map