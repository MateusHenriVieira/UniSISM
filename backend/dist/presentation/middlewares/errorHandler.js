"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const errorHandler = (err, req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            error: { code: err.code, message: err.message, details: err.details },
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: 'PAYLOAD_INVALIDO',
                message: 'Payload inválido',
                details: { issues: err.issues },
            },
        });
        return;
    }
    // Multer
    const anyErr = err;
    if (anyErr?.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
            error: { code: 'ARQUIVO_MUITO_GRANDE', message: 'Arquivo excede o limite' },
        });
        return;
    }
    logger_1.logger.error({ err, requestId: req.requestId }, 'erro não tratado');
    res.status(500).json({
        error: { code: 'ERRO_INTERNO', message: 'Erro interno do servidor' },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map