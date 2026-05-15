"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
class AuthController {
    login;
    logout;
    forgot;
    verify;
    reset;
    me;
    constructor(login, logout, forgot, verify, reset, me) {
        this.login = login;
        this.logout = logout;
        this.forgot = forgot;
        this.verify = verify;
        this.reset = reset;
        this.me = me;
    }
    postLogin = async (req, res) => {
        const out = await this.login.exec({
            login: req.body.login,
            senha: req.body.senha,
            lembrar: req.body.lembrar,
            ip: req.ip ?? '',
            userAgent: req.header('user-agent') ?? '',
        });
        res.status(200).json(out);
    };
    postLogout = async (req, res) => {
        const refreshFromBody = req.body?.refreshToken ?? null;
        await this.logout.exec(refreshFromBody, req.auth?.sid ?? null);
        res.status(204).send();
    };
    postForgot = async (req, res) => {
        const out = await this.forgot.exec(req.body.login);
        res.status(200).json(out);
    };
    postVerify = async (req, res) => {
        const out = await this.verify.exec(req.body.login, req.body.codigo);
        res.status(200).json(out);
    };
    postReset = async (req, res) => {
        const out = await this.reset.exec(req.body.resetToken, req.body.novaSenha);
        res.status(200).json(out);
    };
    getMe = async (req, res) => {
        const out = await this.me.exec(req.auth.sub);
        res.status(200).json(out);
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map