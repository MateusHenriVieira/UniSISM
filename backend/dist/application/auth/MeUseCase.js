"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeUseCase = void 0;
const errors_1 = require("../../shared/errors");
const iniciais_1 = require("../utils/iniciais");
class MeUseCase {
    atendentes;
    constructor(atendentes) {
        this.atendentes = atendentes;
    }
    async exec(atendenteId) {
        const a = await this.atendentes.buscarPorId(atendenteId);
        if (!a)
            throw (0, errors_1.NotFound)('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');
        return {
            id: a.id,
            nome: a.nome,
            matricula: a.matricula,
            iniciais: (0, iniciais_1.iniciais)(a.nome),
            unidade: a.ubs.nome,
            cargo: a.cargo,
        };
    }
}
exports.MeUseCase = MeUseCase;
//# sourceMappingURL=MeUseCase.js.map