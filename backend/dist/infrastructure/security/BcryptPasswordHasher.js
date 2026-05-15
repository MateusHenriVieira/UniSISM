"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BcryptPasswordHasher = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../shared/env");
class BcryptPasswordHasher {
    async hash(senha) {
        return bcryptjs_1.default.hash(senha, env_1.env.BCRYPT_ROUNDS);
    }
    async compare(senha, hash) {
        return bcryptjs_1.default.compare(senha, hash);
    }
}
exports.BcryptPasswordHasher = BcryptPasswordHasher;
//# sourceMappingURL=BcryptPasswordHasher.js.map