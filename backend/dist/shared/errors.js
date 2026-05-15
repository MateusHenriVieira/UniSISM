"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequests = exports.Unprocessable = exports.UnsupportedMediaType = exports.PayloadTooLarge = exports.Conflict = exports.NotFound = exports.Forbidden = exports.Unauthorized = exports.BadRequest = exports.AppError = void 0;
/**
 * Erros tipados para mapear para o formato padrão da especificação (§1.7):
 *   { error: { code, message, details? } }
 */
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
exports.AppError = AppError;
const BadRequest = (code, message, details) => new AppError(400, code, message, details);
exports.BadRequest = BadRequest;
const Unauthorized = (code, message, details) => new AppError(401, code, message, details);
exports.Unauthorized = Unauthorized;
const Forbidden = (code, message, details) => new AppError(403, code, message, details);
exports.Forbidden = Forbidden;
const NotFound = (code, message, details) => new AppError(404, code, message, details);
exports.NotFound = NotFound;
const Conflict = (code, message, details) => new AppError(409, code, message, details);
exports.Conflict = Conflict;
const PayloadTooLarge = (code, message, details) => new AppError(413, code, message, details);
exports.PayloadTooLarge = PayloadTooLarge;
const UnsupportedMediaType = (code, message, details) => new AppError(415, code, message, details);
exports.UnsupportedMediaType = UnsupportedMediaType;
const Unprocessable = (code, message, details) => new AppError(422, code, message, details);
exports.Unprocessable = Unprocessable;
const TooManyRequests = (code, message, details) => new AppError(429, code, message, details);
exports.TooManyRequests = TooManyRequests;
//# sourceMappingURL=errors.js.map