"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function required(name) {
    const v = process.env[name];
    if (!v || v.length === 0) {
        throw new Error(`Variável de ambiente ${name} é obrigatória`);
    }
    return v;
}
function opt(name, fallback) {
    const v = process.env[name];
    return v && v.length > 0 ? v : fallback;
}
exports.env = {
    NODE_ENV: opt('NODE_ENV', 'development'),
    PORT: Number(opt('PORT', '3333')),
    LOG_LEVEL: opt('LOG_LEVEL', 'info'),
    CORS_ORIGIN: opt('CORS_ORIGIN', 'http://localhost:5173'),
    DATABASE_URL: required('DATABASE_URL'),
    JWT_SECRET: opt('JWT_SECRET', 'dev-jwt-secret'),
    JWT_REFRESH_SECRET: opt('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    JWT_EXPIRES_IN: opt('JWT_EXPIRES_IN', '30m'),
    JWT_REFRESH_EXPIRES_IN: opt('JWT_REFRESH_EXPIRES_IN', '7d'),
    BCRYPT_ROUNDS: Number(opt('BCRYPT_ROUNDS', '10')),
    UPLOAD_DIR: opt('UPLOAD_DIR', './uploads'),
    MAX_UPLOAD_MB: Number(opt('MAX_UPLOAD_MB', '10')),
};
//# sourceMappingURL=env.js.map