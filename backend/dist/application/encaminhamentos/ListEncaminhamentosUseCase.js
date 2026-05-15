"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListEncaminhamentosUseCase = void 0;
class ListEncaminhamentosUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    exec(input) {
        return this.repo.listar(input);
    }
}
exports.ListEncaminhamentosUseCase = ListEncaminhamentosUseCase;
//# sourceMappingURL=ListEncaminhamentosUseCase.js.map