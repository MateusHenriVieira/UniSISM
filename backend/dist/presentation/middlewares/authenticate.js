"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAuthenticate = makeAuthenticate;
const errors_1 = require("../../shared/errors");
function makeAuthenticate(tokens) {
    return function authenticate(req, _res, next) {
        const header = req.header('authorization') ?? '';
        const m = /^Bearer\s+(.+)$/i.exec(header);
        if (!m || !m[1]) {
            return next((0, errors_1.Unauthorized)('TOKEN_AUSENTE', 'Token não enviado'));
        }
        try {
            req.auth = tokens.verificarAccess(m[1]);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=authenticate.js.map