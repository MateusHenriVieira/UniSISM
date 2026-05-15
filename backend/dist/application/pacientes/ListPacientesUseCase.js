"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListPacientesUseCase = void 0;
class ListPacientesUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    exec(input) {
        return this.repo.listar(input);
    }
}
exports.ListPacientesUseCase = ListPacientesUseCase;
//# sourceMappingURL=ListPacientesUseCase.js.map