"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PacienteController = void 0;
const zod_1 = require("zod");
const http_1 = require("../../shared/http");
const listarSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    filtro: zod_1.z.enum(['COM_CRONICAS', 'COM_ENCAMINHAMENTOS', 'SEM_ATENDIMENTO_90D']).optional(),
    equipeId: zod_1.z.string().optional(),
    microarea: zod_1.z.string().optional(),
});
class PacienteController {
    list;
    getOne;
    constructor(list, getOne) {
        this.list = list;
        this.getOne = getOne;
    }
    getList = async (req, res) => {
        const q = listarSchema.parse(req.query);
        const lista = await this.list.exec({
            ubsId: req.auth.ubsId,
            ...(q.q ? { q: q.q } : {}),
            ...(q.filtro ? { filtro: q.filtro } : {}),
            ...(q.equipeId ? { equipeId: q.equipeId } : {}),
            ...(q.microarea ? { microarea: q.microarea } : {}),
        });
        res.json(lista);
    };
    getById = async (req, res) => {
        const p = await this.getOne.exec((0, http_1.paramString)(req, 'id'), req.auth.ubsId);
        res.json(p);
    };
}
exports.PacienteController = PacienteController;
//# sourceMappingURL=PacienteController.js.map