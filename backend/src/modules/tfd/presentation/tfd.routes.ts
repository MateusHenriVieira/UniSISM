/**
 * Rotas TFD — montadas sob `/v1/tfd`. RBAC alinhada com TFD_API.md §3 e v0.10.
 *
 * Convenção de roles aceitas:
 *   - rwGestor:  GESTOR_TFD, ADMIN, DEV (operações do dia-a-dia)
 *   - rwAdmin:   ADMIN, DEV apenas (saldo, exportação TJ, verificação)
 *   - rwSolic:   roles que podem criar/listar solicitações (UBS + gestores + REGULADOR_TFD)
 *   - rwReports: relatórios analíticos (gestor/admin/dev — REGULADOR_TFD não)
 *
 * Idempotência (`X-Idempotency-Key`) habilitada em mutações financeiras:
 *   - aportar saldo (frota e ajuda)
 *   - pagar ajuda de custo
 *   - registrar comprovante de abastecimento
 */
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { requireRole } from '../../../presentation/middlewares/requireRole';
import { idempotency } from '../../../presentation/middlewares/idempotency';
import type { TfdController } from './TfdController';

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const single = memoryUpload.single('file');

export function buildTfdRoutes(c: TfdController, authenticate: RequestHandler): Router {
  const router = Router();
  const rwGestor = [authenticate, requireRole('GESTOR_TFD', 'ADMIN', 'DESENVOLVEDOR')];
  const rwAdmin = [authenticate, requireRole('ADMIN', 'DESENVOLVEDOR')];
  const rwSolic = [
    authenticate,
    requireRole(
      'GESTOR_TFD',
      'ADMIN',
      'DESENVOLVEDOR',
      'COORDENADOR_UBS',
      'ATENDENTE_UBS',
      'REGULADOR_TFD',
    ),
  ];
  const rwReports = [authenticate, requireRole('GESTOR_TFD', 'ADMIN', 'DESENVOLVEDOR')];

  // ----- Frota (7) -----
  router.get('/veiculos', ...rwGestor, c.getVeiculos);
  router.post('/veiculos', ...rwGestor, c.postVeiculo);
  router.get('/veiculos/:id', ...rwGestor, c.getVeiculoById);
  router.patch('/veiculos/:id', ...rwGestor, c.patchVeiculo);
  router.post('/veiculos/:id/manutencao', ...rwGestor, c.postVeiculoManutencao);
  router.post('/veiculos/:id/reativar', ...rwGestor, c.postVeiculoReativar);
  router.delete('/veiculos/:id', ...rwAdmin, c.deleteVeiculo);

  // ----- Motoristas (7) -----
  router.get('/motoristas', ...rwGestor, c.getMotoristas);
  router.post('/motoristas', ...rwGestor, c.postMotorista);
  router.get('/motoristas/:id', ...rwGestor, c.getMotoristaById);
  router.patch('/motoristas/:id', ...rwGestor, c.patchMotorista);
  router.post('/motoristas/:id/afastar', ...rwGestor, c.postMotoristaAfastar);
  router.post('/motoristas/:id/reativar', ...rwGestor, c.postMotoristaReativar);
  router.delete('/motoristas/:id', ...rwAdmin, c.deleteMotorista);

  // ----- Solicitações (7) -----
  router.get('/solicitacoes', ...rwSolic, c.getSolicitacoes);
  router.post('/solicitacoes', ...rwSolic, c.postSolicitacao);
  router.get('/solicitacoes/:id', ...rwSolic, c.getSolicitacaoById);
  router.post('/solicitacoes/:id/aprovar', ...rwGestor, c.postAprovarSolicitacao);
  router.post('/solicitacoes/:id/negar', ...rwGestor, c.postNegarSolicitacao);
  router.post('/solicitacoes/:id/anexos', ...rwSolic, single, c.postAnexarSolicitacao);
  router.get('/anexos/:id/download', ...rwSolic, c.getDownloadAnexo);

  // ----- Viagens (10) -----
  router.get('/viagens', ...rwGestor, c.getViagens);
  router.post('/viagens', ...rwGestor, c.postViagem);
  router.get('/viagens/:id', ...rwGestor, c.getViagemById);
  router.patch('/viagens/:id', ...rwGestor, c.patchViagem);
  router.post('/viagens/:id/iniciar', ...rwGestor, c.postIniciarViagem);
  router.post('/viagens/:id/concluir', ...rwGestor, c.postConcluirViagem);
  router.post('/viagens/:id/cancelar', ...rwGestor, c.postCancelarViagem);
  router.post('/viagens/:id/passageiros', ...rwGestor, c.postAlocarPassageiro);
  router.delete('/viagens/:id/passageiros/:pid', ...rwGestor, c.deletePassageiro);
  router.post('/viagens/:id/passageiros/:pid/presenca', ...rwGestor, c.postPresenca);

  // ----- Abastecimento (6) -----
  // Spec §19 (verification doc): liberar/negar é ADMIN/DEV apenas — controle
  // financeiro centralizado. GESTOR_TFD apenas solicita e registra comprovante.
  router.get('/abastecimentos', ...rwGestor, c.getAbastecimentos);
  router.post('/abastecimentos', ...rwGestor, c.postSolicitarAbastecimento);
  router.post('/abastecimentos/:id/liberar', ...rwAdmin, c.postLiberarAbastecimento);
  router.post('/abastecimentos/:id/negar', ...rwAdmin, c.postNegarAbastecimento);
  router.post('/abastecimentos/:id/comprovante', ...rwGestor, single, idempotency, c.postComprovanteAbastecimento);
  router.get('/abastecimentos/:id/comprovante', ...rwGestor, c.getComprovanteAbastecimento);

  // ----- Saldo de Frota (4) -----
  router.get('/saldo', ...rwGestor, c.getSaldo);
  router.post('/saldo/ajustar', ...rwAdmin, c.postAjustarSaldo);
  router.post('/saldo/aportar', ...rwGestor, idempotency, c.postAportarSaldo);
  router.get('/saldo/aportes', ...rwGestor, c.getSaldoAportes);

  // ----- Saldo de Ajuda de Custo (4) -----
  router.get('/saldo-ajuda-custo', ...rwGestor, c.getSaldoAjuda);
  router.post('/saldo-ajuda-custo/ajustar', ...rwAdmin, c.postAjustarSaldoAjuda);
  router.post('/saldo-ajuda-custo/aportar', ...rwGestor, idempotency, c.postAportarSaldoAjuda);
  router.get('/saldo-ajuda-custo/aportes', ...rwGestor, c.getSaldoAjudaAportes);

  // ----- Ajuda de Custo (5) -----
  router.get('/ajudas-custo', ...rwGestor, c.getAjudas);
  router.get('/ajudas-custo/:id', ...rwGestor, c.getAjudaById);
  router.post('/ajudas-custo', ...rwGestor, c.postSolicitarAjuda);
  router.post('/ajudas-custo/:id/autorizar', ...rwGestor, c.postAutorizarAjuda);
  // Spec §19 (verification doc): pagar é ADMIN/DEV apenas — segregação financeira.
  router.post('/ajudas-custo/:id/pagar', ...rwAdmin, single, idempotency, c.postPagarAjuda);
  router.post('/ajudas-custo/:id/negar', ...rwGestor, c.postNegarAjuda);

  // ----- Relatórios (Face 4 v0.10) -----
  router.get('/relatorios/especialidades', ...rwReports, c.getRelatorioEspecialidades);

  // ----- Auditoria (3) -----
  // ⚠️  Ordem importa: rotas específicas ANTES de /:id, senão Express casa /:id primeiro.
  router.get('/auditoria', ...rwAdmin, c.getAuditoria);
  router.get('/auditoria/exportar-tj', ...rwAdmin, c.getExportarTJ);
  router.get('/auditoria/verificar', ...rwAdmin, c.getVerificarIntegridade);
  router.get('/auditoria/:id', ...rwAdmin, c.getAuditoriaById);

  return router;
}
