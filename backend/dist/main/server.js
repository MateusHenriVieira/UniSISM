"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("../shared/env");
const logger_1 = require("../infrastructure/logger");
const prisma_1 = require("../infrastructure/database/prisma");
async function main() {
    const app = (0, app_1.buildApp)();
    const server = app.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`UNISISM · UBS backend escutando em http://localhost:${env_1.env.PORT}/v1`);
    });
    const shutdown = async (signal) => {
        logger_1.logger.warn({ signal }, 'graceful shutdown iniciado');
        server.close(async (err) => {
            if (err)
                logger_1.logger.error({ err }, 'erro ao fechar HTTP server');
            try {
                await prisma_1.prisma.$disconnect();
            }
            finally {
                process.exit(err ? 1 : 0);
            }
        });
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
main().catch((err) => {
    logger_1.logger.error({ err }, 'falha fatal ao iniciar o servidor');
    process.exit(1);
});
//# sourceMappingURL=server.js.map