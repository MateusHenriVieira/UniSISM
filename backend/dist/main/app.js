"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("../shared/env");
const requestId_1 = require("../presentation/middlewares/requestId");
const errorHandler_1 = require("../presentation/middlewares/errorHandler");
const routes_1 = require("../presentation/routes");
const container_1 = require("./container");
function buildApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN.split(',').map((s) => s.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-Id'],
    }));
    app.use(express_1.default.json({ limit: '5mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(requestId_1.requestId);
    app.use((0, morgan_1.default)(env_1.env.NODE_ENV === 'development' ? 'dev' : 'combined', {
        skip: (req) => req.path === '/v1/health',
    }));
    const container = (0, container_1.buildContainer)();
    app.use('/v1', (0, routes_1.buildRoutes)(container));
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map