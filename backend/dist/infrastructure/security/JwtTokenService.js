"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtTokenService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../shared/env");
const errors_1 = require("../../shared/errors");
function parseDuration(v) {
    // aceita formatos "30m", "7d", "1h", "120s", ou número puro em segundos
    const m = /^(\d+)([smhd])$/.exec(v);
    if (!m) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 1800;
    }
    const n = Number(m[1]);
    switch (m[2]) {
        case 's':
            return n;
        case 'm':
            return n * 60;
        case 'h':
            return n * 60 * 60;
        case 'd':
            return n * 60 * 60 * 24;
        default:
            return 1800;
    }
}
class JwtTokenService {
    accessSecret = env_1.env.JWT_SECRET;
    accessExpiresSeconds = parseDuration(env_1.env.JWT_EXPIRES_IN);
    refreshExpiresSeconds = parseDuration(env_1.env.JWT_REFRESH_EXPIRES_IN);
    assinarAccess(payload) {
        const options = { expiresIn: this.accessExpiresSeconds };
        return jsonwebtoken_1.default.sign(payload, this.accessSecret, options);
    }
    verificarAccess(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.accessSecret);
            if (typeof decoded !== 'object' || decoded === null) {
                throw (0, errors_1.Unauthorized)('TOKEN_INVALIDO', 'Token inválido');
            }
            const payload = decoded;
            const sub = payload['sub'];
            const ubsId = payload['ubsId'];
            const role = payload['role'];
            if (typeof sub !== 'string' || typeof ubsId !== 'string' || typeof role !== 'string') {
                throw (0, errors_1.Unauthorized)('TOKEN_INVALIDO', 'Token inválido');
            }
            const result = { sub, ubsId, role };
            const sid = payload['sid'];
            if (typeof sid === 'string')
                result.sid = sid;
            return result;
        }
        catch (err) {
            if (err instanceof Error && err.name === 'TokenExpiredError') {
                throw (0, errors_1.Unauthorized)('TOKEN_EXPIRADO', 'Token expirado');
            }
            throw (0, errors_1.Unauthorized)('TOKEN_INVALIDO', 'Token inválido');
        }
    }
    gerarRefresh() {
        const token = node_crypto_1.default.randomBytes(48).toString('base64url');
        const hash = this.hashRefresh(token);
        const expiraEm = new Date(Date.now() + this.refreshExpiresSeconds * 1000);
        return { token, hash, expiraEm };
    }
    hashRefresh(token) {
        return node_crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    ttlAccessSeconds() {
        return this.accessExpiresSeconds;
    }
}
exports.JwtTokenService = JwtTokenService;
//# sourceMappingURL=JwtTokenService.js.map