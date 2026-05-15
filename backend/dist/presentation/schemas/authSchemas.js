"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.verifyCodeSchema = exports.forgotSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    login: zod_1.z.string().min(3),
    senha: zod_1.z.string().min(1),
    lembrar: zod_1.z.boolean().optional(),
});
exports.forgotSchema = zod_1.z.object({
    login: zod_1.z.string().min(3),
});
exports.verifyCodeSchema = zod_1.z.object({
    login: zod_1.z.string().min(3),
    codigo: zod_1.z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
});
exports.resetPasswordSchema = zod_1.z.object({
    resetToken: zod_1.z.string().min(8),
    novaSenha: zod_1.z.string().min(8),
});
exports.changePasswordSchema = zod_1.z.object({
    senhaAtual: zod_1.z.string().min(1),
    novaSenha: zod_1.z.string().min(8),
});
//# sourceMappingURL=authSchemas.js.map