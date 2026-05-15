"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRoutes = buildRoutes;
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const authenticate_1 = require("../middlewares/authenticate");
const uploads_1 = require("../middlewares/uploads");
const authSchemas_1 = require("../schemas/authSchemas");
function buildRoutes(deps) {
    const router = (0, express_1.Router)();
    const authenticate = (0, authenticate_1.makeAuthenticate)(deps.tokens);
    // ----- Auth (público) -----
    router.post('/auth/login', (0, validate_1.validateBody)(authSchemas_1.loginSchema), deps.auth.postLogin);
    router.post('/auth/forgot-password', (0, validate_1.validateBody)(authSchemas_1.forgotSchema), deps.auth.postForgot);
    router.post('/auth/verify-code', (0, validate_1.validateBody)(authSchemas_1.verifyCodeSchema), deps.auth.postVerify);
    router.post('/auth/reset-password', (0, validate_1.validateBody)(authSchemas_1.resetPasswordSchema), deps.auth.postReset);
    router.post('/auth/logout', authenticate, deps.auth.postLogout);
    router.get('/auth/me', authenticate, deps.auth.getMe);
    // ----- Perfil -----
    router.get('/me/profile', authenticate, deps.perfil.get);
    router.post('/me/password', authenticate, (0, validate_1.validateBody)(authSchemas_1.changePasswordSchema), deps.perfil.postChangePassword);
    router.post('/me/sessions/revoke-others', authenticate, deps.perfil.postRevokeOthers);
    // ----- Dashboard -----
    router.get('/dashboard/metrics', authenticate, deps.dashboard.get);
    // ----- Encaminhamentos -----
    router.post('/encaminhamentos/extract-pdf', authenticate, uploads_1.memoryUpload.single('file'), deps.encaminhamentos.postExtractPdf);
    router.post('/encaminhamentos', authenticate, uploads_1.memoryUpload.fields([
        { name: 'solicitacao', maxCount: 1 },
        { name: 'anexo', maxCount: 10 },
    ]), deps.encaminhamentos.postCreate);
    router.get('/encaminhamentos', authenticate, deps.encaminhamentos.getList);
    router.get('/encaminhamentos/:id', authenticate, deps.encaminhamentos.getById);
    router.post('/encaminhamentos/:id/resolve-pendencia', authenticate, uploads_1.memoryUpload.array('anexo', 10), deps.encaminhamentos.postResolverPendencia);
    // ----- Pacientes -----
    router.get('/pacientes', authenticate, deps.pacientes.getList);
    router.get('/pacientes/:id', authenticate, deps.pacientes.getById);
    // ----- Relatórios -----
    router.get('/relatorios', authenticate, deps.relatorios.getList);
    router.post('/relatorios', authenticate, deps.relatorios.postCreate);
    router.get('/relatorios/:id/download', authenticate, deps.relatorios.getDownload);
    // ----- Health -----
    router.get('/health', (_req, res) => res.json({ ok: true }));
    return router;
}
//# sourceMappingURL=index.js.map