"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListRelatoriosUseCase = void 0;
class ListRelatoriosUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    exec(atendenteId) {
        return this.repo.listar(atendenteId);
    }
}
exports.ListRelatoriosUseCase = ListRelatoriosUseCase;
//# sourceMappingURL=ListRelatoriosUseCase.js.map