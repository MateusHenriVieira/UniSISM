"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContainer = buildContainer;
// Composition root — instancia repositórios, serviços, use cases e controllers.
// Sem framework de DI: explícito e fácil de seguir.
const PrismaAtendenteRepository_1 = require("../infrastructure/database/PrismaAtendenteRepository");
const PrismaSessaoRepository_1 = require("../infrastructure/database/PrismaSessaoRepository");
const PrismaPasswordResetRepository_1 = require("../infrastructure/database/PrismaPasswordResetRepository");
const PrismaEncaminhamentoRepository_1 = require("../infrastructure/database/PrismaEncaminhamentoRepository");
const PrismaPacienteRepository_1 = require("../infrastructure/database/PrismaPacienteRepository");
const PrismaRelatorioRepository_1 = require("../infrastructure/database/PrismaRelatorioRepository");
const BcryptPasswordHasher_1 = require("../infrastructure/security/BcryptPasswordHasher");
const JwtTokenService_1 = require("../infrastructure/security/JwtTokenService");
const DiskFileStorage_1 = require("../infrastructure/storage/DiskFileStorage");
const PdfParseService_1 = require("../infrastructure/services/PdfParseService");
const LoginUseCase_1 = require("../application/auth/LoginUseCase");
const LogoutUseCase_1 = require("../application/auth/LogoutUseCase");
const ForgotPasswordUseCase_1 = require("../application/auth/ForgotPasswordUseCase");
const VerifyCodeUseCase_1 = require("../application/auth/VerifyCodeUseCase");
const ResetPasswordUseCase_1 = require("../application/auth/ResetPasswordUseCase");
const MeUseCase_1 = require("../application/auth/MeUseCase");
const GetProfileUseCase_1 = require("../application/perfil/GetProfileUseCase");
const ChangePasswordUseCase_1 = require("../application/perfil/ChangePasswordUseCase");
const RevokeOtherSessionsUseCase_1 = require("../application/perfil/RevokeOtherSessionsUseCase");
const GetMetricsUseCase_1 = require("../application/dashboard/GetMetricsUseCase");
const ExtractPdfUseCase_1 = require("../application/encaminhamentos/ExtractPdfUseCase");
const CreateEncaminhamentoUseCase_1 = require("../application/encaminhamentos/CreateEncaminhamentoUseCase");
const ListEncaminhamentosUseCase_1 = require("../application/encaminhamentos/ListEncaminhamentosUseCase");
const GetEncaminhamentoUseCase_1 = require("../application/encaminhamentos/GetEncaminhamentoUseCase");
const ResolverPendenciaUseCase_1 = require("../application/encaminhamentos/ResolverPendenciaUseCase");
const ListPacientesUseCase_1 = require("../application/pacientes/ListPacientesUseCase");
const GetPacienteUseCase_1 = require("../application/pacientes/GetPacienteUseCase");
const ListRelatoriosUseCase_1 = require("../application/relatorios/ListRelatoriosUseCase");
const CreateRelatorioUseCase_1 = require("../application/relatorios/CreateRelatorioUseCase");
const DownloadRelatorioUseCase_1 = require("../application/relatorios/DownloadRelatorioUseCase");
const AuthController_1 = require("../presentation/controllers/AuthController");
const PerfilController_1 = require("../presentation/controllers/PerfilController");
const DashboardController_1 = require("../presentation/controllers/DashboardController");
const EncaminhamentoController_1 = require("../presentation/controllers/EncaminhamentoController");
const PacienteController_1 = require("../presentation/controllers/PacienteController");
const RelatorioController_1 = require("../presentation/controllers/RelatorioController");
function buildContainer() {
    // Infra
    const atendentes = new PrismaAtendenteRepository_1.PrismaAtendenteRepository();
    const sessoes = new PrismaSessaoRepository_1.PrismaSessaoRepository();
    const resets = new PrismaPasswordResetRepository_1.PrismaPasswordResetRepository();
    const encaminhamentosRepo = new PrismaEncaminhamentoRepository_1.PrismaEncaminhamentoRepository();
    const pacientesRepo = new PrismaPacienteRepository_1.PrismaPacienteRepository();
    const relatoriosRepo = new PrismaRelatorioRepository_1.PrismaRelatorioRepository();
    const hasher = new BcryptPasswordHasher_1.BcryptPasswordHasher();
    const tokens = new JwtTokenService_1.JwtTokenService();
    const storage = new DiskFileStorage_1.DiskFileStorage();
    const pdfExtractor = new PdfParseService_1.PdfParseService();
    // Application
    const loginUC = new LoginUseCase_1.LoginUseCase(atendentes, sessoes, hasher, tokens);
    const logoutUC = new LogoutUseCase_1.LogoutUseCase(sessoes, tokens);
    const forgotUC = new ForgotPasswordUseCase_1.ForgotPasswordUseCase(atendentes, resets, hasher);
    const verifyUC = new VerifyCodeUseCase_1.VerifyCodeUseCase(atendentes, resets, hasher);
    const resetUC = new ResetPasswordUseCase_1.ResetPasswordUseCase(atendentes, resets, sessoes, hasher);
    const meUC = new MeUseCase_1.MeUseCase(atendentes);
    const getProfileUC = new GetProfileUseCase_1.GetProfileUseCase();
    const changePasswordUC = new ChangePasswordUseCase_1.ChangePasswordUseCase(atendentes, sessoes, hasher);
    const revokeOthersUC = new RevokeOtherSessionsUseCase_1.RevokeOtherSessionsUseCase(sessoes);
    const getMetricsUC = new GetMetricsUseCase_1.GetMetricsUseCase(encaminhamentosRepo);
    const extractPdfUC = new ExtractPdfUseCase_1.ExtractPdfUseCase(pdfExtractor);
    const createEncUC = new CreateEncaminhamentoUseCase_1.CreateEncaminhamentoUseCase(encaminhamentosRepo, storage);
    const listEncUC = new ListEncaminhamentosUseCase_1.ListEncaminhamentosUseCase(encaminhamentosRepo);
    const getEncUC = new GetEncaminhamentoUseCase_1.GetEncaminhamentoUseCase(encaminhamentosRepo);
    const resolverUC = new ResolverPendenciaUseCase_1.ResolverPendenciaUseCase(encaminhamentosRepo, storage);
    const listPacUC = new ListPacientesUseCase_1.ListPacientesUseCase(pacientesRepo);
    const getPacUC = new GetPacienteUseCase_1.GetPacienteUseCase(pacientesRepo);
    const listRelUC = new ListRelatoriosUseCase_1.ListRelatoriosUseCase(relatoriosRepo);
    const createRelUC = new CreateRelatorioUseCase_1.CreateRelatorioUseCase(relatoriosRepo, storage);
    const downloadRelUC = new DownloadRelatorioUseCase_1.DownloadRelatorioUseCase(relatoriosRepo, storage);
    // Controllers
    const authController = new AuthController_1.AuthController(loginUC, logoutUC, forgotUC, verifyUC, resetUC, meUC);
    const perfilController = new PerfilController_1.PerfilController(getProfileUC, changePasswordUC, revokeOthersUC);
    const dashboardController = new DashboardController_1.DashboardController(getMetricsUC);
    const encController = new EncaminhamentoController_1.EncaminhamentoController(extractPdfUC, createEncUC, listEncUC, getEncUC, resolverUC, atendentes);
    const pacController = new PacienteController_1.PacienteController(listPacUC, getPacUC);
    const relController = new RelatorioController_1.RelatorioController(listRelUC, createRelUC, downloadRelUC);
    return {
        tokens,
        auth: authController,
        perfil: perfilController,
        dashboard: dashboardController,
        encaminhamentos: encController,
        pacientes: pacController,
        relatorios: relController,
    };
}
//# sourceMappingURL=container.js.map