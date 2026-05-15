// Composition root — instancia repositórios, serviços, use cases e controllers.
import { PrismaAtendenteRepository } from '../infrastructure/database/PrismaAtendenteRepository';
import { PrismaSessaoRepository } from '../infrastructure/database/PrismaSessaoRepository';
import { PrismaPasswordResetRepository } from '../infrastructure/database/PrismaPasswordResetRepository';
import { PrismaEncaminhamentoRepository } from '../infrastructure/database/PrismaEncaminhamentoRepository';
import { PrismaPacienteRepository } from '../infrastructure/database/PrismaPacienteRepository';

import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher';
import { JwtTokenService } from '../infrastructure/security/JwtTokenService';
import { buildFileStorage } from '../infrastructure/storage';
import { PdfParseService } from '../infrastructure/services/PdfParseService';
import { PrismaAuditLogger } from '../infrastructure/audit/PrismaAuditLogger';
import { buildScanner } from '../infrastructure/scan/ClamavScanner';
import {
  OutboxPublisher,
  logOnlyOutboxHandler,
} from '../infrastructure/outbox/OutboxBus';

import { LoginUseCase } from '../application/auth/LoginUseCase';
import { LogoutUseCase } from '../application/auth/LogoutUseCase';
import { ForgotPasswordUseCase } from '../application/auth/ForgotPasswordUseCase';
import { VerifyCodeUseCase } from '../application/auth/VerifyCodeUseCase';
import { ResetPasswordUseCase } from '../application/auth/ResetPasswordUseCase';
import { MeUseCase } from '../application/auth/MeUseCase';
import { GetProfileUseCase } from '../application/perfil/GetProfileUseCase';
import { ChangePasswordUseCase } from '../application/perfil/ChangePasswordUseCase';
import { RevokeOtherSessionsUseCase } from '../application/perfil/RevokeOtherSessionsUseCase';
import { GetMetricsUseCase } from '../application/dashboard/GetMetricsUseCase';
import { ExtractPdfUseCase } from '../application/encaminhamentos/ExtractPdfUseCase';
import { CreateEncaminhamentoUseCase } from '../application/encaminhamentos/CreateEncaminhamentoUseCase';
import { ListEncaminhamentosUseCase } from '../application/encaminhamentos/ListEncaminhamentosUseCase';
import { GetEncaminhamentoUseCase } from '../application/encaminhamentos/GetEncaminhamentoUseCase';
import { ResolverPendenciaUseCase } from '../application/encaminhamentos/ResolverPendenciaUseCase';
import { ListPacientesUseCase } from '../application/pacientes/ListPacientesUseCase';
import { GetPacienteUseCase } from '../application/pacientes/GetPacienteUseCase';
import { GetDownloadAnexoUseCase } from '../application/anexos/GetDownloadAnexoUseCase';
import { AnexosController } from '../presentation/controllers/AnexosController';
import { CriarRelatorioUseCase } from '../modules/relatorios/application/CriarRelatorioUseCase';
import { ListarRelatoriosUseCase } from '../modules/relatorios/application/ListarRelatoriosUseCase';
import { BaixarRelatorioUseCase } from '../modules/relatorios/application/BaixarRelatorioUseCase';
import { RelatorioWorker } from '../modules/relatorios/application/RelatorioWorker';
import { ExpiracaoCron } from '../modules/relatorios/application/ExpiracaoCron';
import { RelatoriosController as RelatoriosControllerV2 } from '../modules/relatorios/presentation/RelatoriosController';
import { CreatePrefeituraUseCase } from '../application/admin/CreatePrefeituraUseCase';
import { ListPrefeiturasUseCase } from '../application/admin/ListPrefeiturasUseCase';
import { CreateUbsUseCase } from '../application/admin/CreateUbsUseCase';
import { ListUbsUseCase } from '../application/admin/ListUbsUseCase';
import { CreateUsuarioUseCase } from '../application/admin/CreateUsuarioUseCase';
import { ListUsuariosUseCase } from '../application/admin/ListUsuariosUseCase';

import { AuthController } from '../presentation/controllers/AuthController';
import { PerfilController } from '../presentation/controllers/PerfilController';
import { DashboardController } from '../presentation/controllers/DashboardController';
import { EncaminhamentoController } from '../presentation/controllers/EncaminhamentoController';
import { PacienteController } from '../presentation/controllers/PacienteController';
import { AdminController } from '../presentation/controllers/AdminController';

import { AprovarEncaminhamentoUseCase } from '../modules/gestao/application/use-cases/AprovarEncaminhamentoUseCase';
import { RegistrarPendenciaUseCase } from '../modules/gestao/application/use-cases/RegistrarPendenciaUseCase';
import { RejeitarEncaminhamentoUseCase } from '../modules/gestao/application/use-cases/RejeitarEncaminhamentoUseCase';
import { RegistrarRespostaSusUseCase } from '../modules/gestao/application/use-cases/RegistrarRespostaSusUseCase';
import { GetArvoreEncaminhamentosUseCase } from '../modules/gestao/application/use-cases/GetArvoreEncaminhamentosUseCase';
import { RegulacaoController } from '../modules/gestao/presentation/controllers/RegulacaoController';

import { UpdateUsuarioUseCase } from '../application/admin/UpdateUsuarioUseCase';
import { DeleteUsuarioUseCase } from '../application/admin/DeleteUsuarioUseCase';
import { AlterarAtivoUsuarioUseCase } from '../application/admin/AlterarAtivoUsuarioUseCase';
import { ResetarSenhaUsuarioUseCase } from '../application/admin/ResetarSenhaUsuarioUseCase';
import { UpdatePrefeituraUseCase } from '../application/admin/UpdatePrefeituraUseCase';
import { DeletePrefeituraUseCase } from '../application/admin/DeletePrefeituraUseCase';
import { UpdateUbsUseCase } from '../application/admin/UpdateUbsUseCase';
import { DeleteUbsUseCase } from '../application/admin/DeleteUbsUseCase';
import { UpdateEncaminhamentoUseCase } from '../application/encaminhamentos/UpdateEncaminhamentoUseCase';
import { DeleteEncaminhamentoUseCase } from '../application/encaminhamentos/DeleteEncaminhamentoUseCase';
import { UpdatePacienteUseCase } from '../application/pacientes/UpdatePacienteUseCase';
import { DeletePacienteUseCase } from '../application/pacientes/DeletePacienteUseCase';
import { BuscarPacientePorCpfUseCase } from '../application/pacientes/BuscarPacientePorCpfUseCase';

import { PrismaProntuarioAuditLogger } from '../modules/prontuario/infrastructure/PrismaProntuarioAuditLogger';
import { AddAlergiaUseCase, RemoveAlergiaUseCase } from '../modules/prontuario/application/alergias';
import {
  AddCondicaoCronicaUseCase,
  UpdateCondicaoCronicaUseCase,
  RemoveCondicaoCronicaUseCase,
} from '../modules/prontuario/application/condicoes-cronicas';
import {
  AddMedicamentoUseCase,
  UpdateMedicamentoUseCase,
  RemoveMedicamentoUseCase,
} from '../modules/prontuario/application/medicamentos';
import { SetHistoricoFamiliarUseCase } from '../modules/prontuario/application/historico-familiar';
import {
  AddAtendimentoUseCase,
  RemoveAtendimentoUseCase,
} from '../modules/prontuario/application/atendimentos';
import { AddExameUseCase, RemoveExameUseCase } from '../modules/prontuario/application/exames';
import { AddVacinaUseCase, RemoveVacinaUseCase } from '../modules/prontuario/application/vacinas';
import {
  AddViagemTfdUseCase,
  UpdateViagemTfdUseCase,
  RemoveViagemTfdUseCase,
} from '../modules/prontuario/application/viagens-tfd';
import { ProntuarioController } from '../modules/prontuario/presentation/ProntuarioController';

import { TfdAuditLogger } from '../modules/tfd/infrastructure/TfdAuditLogger';
import { VeiculosTfdUseCases } from '../modules/tfd/application/veiculos';
import { MotoristasTfdUseCases } from '../modules/tfd/application/motoristas';
import { SolicitacoesTfdUseCases } from '../modules/tfd/application/solicitacoes';
import { ViagensTfdUseCases } from '../modules/tfd/application/viagens';
import { AbastecimentosUseCases } from '../modules/tfd/application/abastecimentos';
import { SaldoUseCases } from '../modules/tfd/application/saldo';
import { SaldoAjudaCustoUseCases } from '../modules/tfd/application/saldo-ajuda-custo';
import { AjudasCustoUseCases } from '../modules/tfd/application/ajudas-custo';
import { AuditoriaTfdUseCases } from '../modules/tfd/application/auditoria';
import { RelatoriosTfdUseCases } from '../modules/tfd/application/relatorios';
import { TfdController } from '../modules/tfd/presentation/TfdController';

import { LoginPacienteUseCase } from '../modules/paciente-app/application/use-cases/LoginPacienteUseCase';
import { AtivarContaPacienteUseCase } from '../modules/paciente-app/application/use-cases/AtivarContaPacienteUseCase';
import { ListarMeusEncaminhamentosUseCase } from '../modules/paciente-app/application/use-cases/ListarMeusEncaminhamentosUseCase';
import { ListarNotificacoesUseCase } from '../modules/paciente-app/application/use-cases/ListarNotificacoesUseCase';
import { TrocarSenhaPacienteUseCase } from '../modules/paciente-app/application/use-cases/TrocarSenhaPacienteUseCase';
import { PacienteAppController } from '../modules/paciente-app/presentation/controllers/PacienteAppController';

export function buildContainer() {
  const atendentes = new PrismaAtendenteRepository();
  const sessoes = new PrismaSessaoRepository();
  const resets = new PrismaPasswordResetRepository();
  const encaminhamentosRepo = new PrismaEncaminhamentoRepository();
  const pacientesRepo = new PrismaPacienteRepository();

  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService();
  const storage = buildFileStorage();
  const pdfExtractor = new PdfParseService();
  const audit = new PrismaAuditLogger();
  const scanner = buildScanner();

  // Outbox publisher (start é feito em main/server.ts depois do boot)
  const outbox = new OutboxPublisher(logOnlyOutboxHandler, {
    intervalMs: Number(process.env['OUTBOX_INTERVAL_MS'] ?? 500),
  });

  const loginUC = new LoginUseCase(atendentes, sessoes, hasher, tokens, audit);
  const logoutUC = new LogoutUseCase(sessoes, tokens);
  const forgotUC = new ForgotPasswordUseCase(atendentes, resets, hasher);
  const verifyUC = new VerifyCodeUseCase(atendentes, resets, hasher);
  const resetUC = new ResetPasswordUseCase(atendentes, resets, sessoes, hasher);
  const meUC = new MeUseCase(atendentes);

  const getProfileUC = new GetProfileUseCase();
  const changePasswordUC = new ChangePasswordUseCase(atendentes, sessoes, hasher);
  const revokeOthersUC = new RevokeOtherSessionsUseCase(sessoes);

  const getMetricsUC = new GetMetricsUseCase(encaminhamentosRepo);

  const extractPdfUC = new ExtractPdfUseCase(pdfExtractor);
  const createEncUC = new CreateEncaminhamentoUseCase(encaminhamentosRepo, storage, scanner);
  const listEncUC = new ListEncaminhamentosUseCase(encaminhamentosRepo);
  const getEncUC = new GetEncaminhamentoUseCase(encaminhamentosRepo);
  const resolverUC = new ResolverPendenciaUseCase(encaminhamentosRepo, storage);

  const listPacUC = new ListPacientesUseCase(pacientesRepo);
  const getPacUC = new GetPacienteUseCase(pacientesRepo);

  // ----- Módulo Relatórios (LGPD-first) -----
  const relWorker = new RelatorioWorker(storage);
  const criarRelUC = new CriarRelatorioUseCase(relWorker);
  const listarRelUC = new ListarRelatoriosUseCase();
  const baixarRelUC = new BaixarRelatorioUseCase(storage);
  const relExpiracaoCron = new ExpiracaoCron(storage);

  const createPrefeituraUC = new CreatePrefeituraUseCase();
  const listPrefeiturasUC = new ListPrefeiturasUseCase();
  const createUbsUC = new CreateUbsUseCase();
  const listUbsUC = new ListUbsUseCase();
  const createUsuarioUC = new CreateUsuarioUseCase(hasher, audit);
  const listUsuariosUC = new ListUsuariosUseCase();
  const updateUsuarioUC = new UpdateUsuarioUseCase(audit);
  const deleteUsuarioUC = new DeleteUsuarioUseCase(audit);
  const alterarAtivoUC = new AlterarAtivoUsuarioUseCase(audit);
  const resetarSenhaUC = new ResetarSenhaUsuarioUseCase(hasher, audit);
  const updatePrefeituraUC = new UpdatePrefeituraUseCase(audit);
  const deletePrefeituraUC = new DeletePrefeituraUseCase(audit);
  const updateUbsUC = new UpdateUbsUseCase(audit);
  const deleteUbsUC = new DeleteUbsUseCase(audit);
  const updateEncUC = new UpdateEncaminhamentoUseCase(audit);
  const deleteEncUC = new DeleteEncaminhamentoUseCase(audit);
  const updatePacienteUC = new UpdatePacienteUseCase(pacientesRepo, audit);
  const deletePacienteUC = new DeletePacienteUseCase(audit);
  const buscarPacientePorCpfUC = new BuscarPacientePorCpfUseCase();

  const authController = new AuthController(loginUC, logoutUC, forgotUC, verifyUC, resetUC, meUC);
  const perfilController = new PerfilController(getProfileUC, changePasswordUC, revokeOthersUC);
  const dashboardController = new DashboardController(getMetricsUC);
  const encController = new EncaminhamentoController(
    extractPdfUC,
    createEncUC,
    listEncUC,
    getEncUC,
    resolverUC,
    updateEncUC,
    deleteEncUC,
    atendentes,
  );
  const pacController = new PacienteController(
    listPacUC,
    getPacUC,
    updatePacienteUC,
    deletePacienteUC,
    buscarPacientePorCpfUC,
  );
  const relController = new RelatoriosControllerV2(criarRelUC, listarRelUC, baixarRelUC, atendentes);
  const adminController = new AdminController(
    createPrefeituraUC,
    listPrefeiturasUC,
    createUbsUC,
    listUbsUC,
    createUsuarioUC,
    listUsuariosUC,
    updateUsuarioUC,
    deleteUsuarioUC,
    alterarAtivoUC,
    resetarSenhaUC,
    updatePrefeituraUC,
    deletePrefeituraUC,
    updateUbsUC,
    deleteUbsUC,
  );

  // ----- Módulo Gestão (Face 2 · SMS) -----
  const aprovarUC = new AprovarEncaminhamentoUseCase();
  const pendenciaUC = new RegistrarPendenciaUseCase();
  const rejeitarUC = new RejeitarEncaminhamentoUseCase();
  const respostaSusUC = new RegistrarRespostaSusUseCase(storage, scanner);
  const arvoreUC = new GetArvoreEncaminhamentosUseCase();
  const regulacaoController = new RegulacaoController(
    atendentes,
    aprovarUC,
    pendenciaUC,
    rejeitarUC,
    respostaSusUC,
    arvoreUC,
  );

  // ----- Módulo Prontuário (CRUD de sub-documentos) -----
  const prontuarioAudit = new PrismaProntuarioAuditLogger();
  const prontuarioController = new ProntuarioController({
    addAlergia: new AddAlergiaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeAlergia: new RemoveAlergiaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addCondicaoCronica: new AddCondicaoCronicaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    updateCondicaoCronica: new UpdateCondicaoCronicaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeCondicaoCronica: new RemoveCondicaoCronicaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addMedicamento: new AddMedicamentoUseCase(pacientesRepo, atendentes, prontuarioAudit),
    updateMedicamento: new UpdateMedicamentoUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeMedicamento: new RemoveMedicamentoUseCase(pacientesRepo, atendentes, prontuarioAudit),
    setHistoricoFamiliar: new SetHistoricoFamiliarUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addAtendimento: new AddAtendimentoUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeAtendimento: new RemoveAtendimentoUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addExame: new AddExameUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeExame: new RemoveExameUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addVacina: new AddVacinaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeVacina: new RemoveVacinaUseCase(pacientesRepo, atendentes, prontuarioAudit),
    addViagemTfd: new AddViagemTfdUseCase(pacientesRepo, atendentes, prontuarioAudit),
    updateViagemTfd: new UpdateViagemTfdUseCase(pacientesRepo, atendentes, prontuarioAudit),
    removeViagemTfd: new RemoveViagemTfdUseCase(pacientesRepo, atendentes, prontuarioAudit),
  });

  // ----- Módulo TFD (Face 4) -----
  const tfdAudit = new TfdAuditLogger();
  const tfdController = new TfdController({
    veiculos: new VeiculosTfdUseCases(tfdAudit, atendentes),
    motoristas: new MotoristasTfdUseCases(tfdAudit, atendentes),
    solicitacoes: new SolicitacoesTfdUseCases(tfdAudit, atendentes, storage, scanner),
    viagens: new ViagensTfdUseCases(tfdAudit, atendentes),
    abastecimentos: new AbastecimentosUseCases(tfdAudit, atendentes, storage, scanner),
    saldo: new SaldoUseCases(tfdAudit, atendentes),
    saldoAjudaCusto: new SaldoAjudaCustoUseCases(tfdAudit, atendentes),
    ajudasCusto: new AjudasCustoUseCases(tfdAudit, atendentes, storage),
    auditoria: new AuditoriaTfdUseCases(),
    relatorios: new RelatoriosTfdUseCases(),
  });

  // ----- Módulo App do Paciente (Face 3) -----
  const loginPacienteUC = new LoginPacienteUseCase(hasher);
  const ativarContaUC = new AtivarContaPacienteUseCase(hasher);
  const listMeusEncsUC = new ListarMeusEncaminhamentosUseCase();
  const notifsUC = new ListarNotificacoesUseCase();
  const trocarSenhaPacienteUC = new TrocarSenhaPacienteUseCase(hasher);
  const pacienteAppController = new PacienteAppController(
    loginPacienteUC,
    ativarContaUC,
    listMeusEncsUC,
    notifsUC,
    trocarSenhaPacienteUC,
  );

  // ----- Anexos (download genérico — Face 2 SMS) -----
  const downloadAnexoUC = new GetDownloadAnexoUseCase(storage);
  const anexosController = new AnexosController(downloadAnexoUC);

  return {
    tokens,
    audit,
    scanner,
    outbox,
    storage,
    relExpiracaoCron,
    auth: authController,
    perfil: perfilController,
    dashboard: dashboardController,
    encaminhamentos: encController,
    pacientes: pacController,
    relatorios: relController,
    admin: adminController,
    regulacao: regulacaoController,
    pacienteApp: pacienteAppController,
    prontuario: prontuarioController,
    tfd: tfdController,
    anexos: anexosController,
  };
}

export type Container = ReturnType<typeof buildContainer>;
