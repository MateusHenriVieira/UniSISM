"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfilController = void 0;
const errors_1 = require("../../shared/errors");
class PerfilController {
    getProfile;
    changePassword;
    revokeOthers;
    constructor(getProfile, changePassword, revokeOthers) {
        this.getProfile = getProfile;
        this.changePassword = changePassword;
        this.revokeOthers = revokeOthers;
    }
    get = async (req, res) => {
        const perfil = await this.getProfile.exec(req.auth.sub);
        res.json(perfil);
    };
    postChangePassword = async (req, res) => {
        await this.changePassword.exec(req.auth.sub, req.body.senhaAtual, req.body.novaSenha);
        res.status(204).send();
    };
    postRevokeOthers = async (req, res) => {
        const sid = req.auth?.sid;
        if (!sid)
            throw (0, errors_1.Unauthorized)('SESSAO_INDETERMINADA', 'Sessão atual indefinida');
        const out = await this.revokeOthers.exec(req.auth.sub, sid);
        res.json(out);
    };
}
exports.PerfilController = PerfilController;
//# sourceMappingURL=PerfilController.js.map