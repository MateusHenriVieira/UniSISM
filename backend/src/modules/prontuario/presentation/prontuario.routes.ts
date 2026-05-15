/**
 * Rotas de CRUD do prontuário — montadas sob `/v1/pacientes/:pacienteId`.
 *
 * Matriz RBAC (Spec §10 — `PRONTUARIO_PACIENTE.md`):
 *
 * | Recurso              | ATEND_UBS | COORD_UBS | REGUL_SMS | REGUL_TFD | GESTOR_TFD | ADMIN | DEV |
 * | -------------------- | :-------: | :-------: | :-------: | :-------: | :--------: | :---: | :-: |
 * | Alergias POST        |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Alergias DELETE      |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Condições POST/PATCH |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Condições DELETE     |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Medicamentos POST/PATCH | ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Medicamentos DELETE  |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Histórico PUT        |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Atendimentos POST    |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Atendimentos DELETE  |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Exames POST          |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Exames DELETE        |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Vacinação POST       |    ✅     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Vacinação DELETE     |    ❌     |    ✅     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 * | Viagens TFD POST/PATCH | ❌     |    ✅     |     ✅    |     ✅    |     ✅     |  ✅   | ✅  |
 * | Viagens TFD DELETE   |    ❌     |    ❌     |     ❌    |     ❌    |     ❌     |  ✅   | ✅  |
 *
 * Princípios aplicados:
 *   1. Atendente cria; só coord+ remove (preserva rastreabilidade).
 *   2. Reguladores SMS/TFD e Gestor TFD não tocam o prontuário primário —
 *      seu escopo é a viagem TFD do paciente.
 *   3. DELETE viagem é privilégio de ADMIN+ (afeta orçamento municipal).
 *   4. Multi-tenancy é aplicado dentro do use case via `assertAcessoPaciente`
 *      (404 PACIENTE_NAO_ENCONTRADO em vez de 403, evita vazamento).
 */
import { Router, type RequestHandler } from 'express';
import { requireRole } from '../../../presentation/middlewares/requireRole';
import type { ProntuarioController } from './ProntuarioController';

export function buildProntuarioRoutes(
  c: ProntuarioController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  // Quem cria/edita o prontuário primário (UBS): atendente + coord + admin + dev.
  const ubsWrite = [
    authenticate,
    requireRole('DESENVOLVEDOR', 'ADMIN', 'COORDENADOR_UBS', 'ATENDENTE_UBS'),
  ];
  // DELETEs sensíveis (condições, medicamentos, atendimentos, exames, vacinas):
  // somente coord+ — atendente NÃO deleta para preservar histórico.
  const ubsDelete = [
    authenticate,
    requireRole('DESENVOLVEDOR', 'ADMIN', 'COORDENADOR_UBS'),
  ];
  // Viagens TFD: COORD_UBS, reguladores SMS/TFD, gestor TFD, admin, dev.
  // Atendente UBS não cria/edita viagem — está fora do seu escopo.
  const viagemTfdWrite = [
    authenticate,
    requireRole(
      'DESENVOLVEDOR',
      'ADMIN',
      'COORDENADOR_UBS',
      'REGULADOR_SMS',
      'REGULADOR_TFD',
      'GESTOR_TFD',
    ),
  ];
  // DELETE viagem TFD: ADMIN+ (afeta orçamento municipal).
  const viagemTfdDelete = [
    authenticate,
    requireRole('DESENVOLVEDOR', 'ADMIN'),
  ];

  // ----- Alergias -----
  // DELETE exige COORD+ (spec §19 — atendente cria, não deleta).
  router.post('/:pacienteId/alergias', ...ubsWrite, c.postAddAlergia);
  router.delete('/:pacienteId/alergias/:id', ...ubsDelete, c.deleteAlergia);

  // ----- Condições crônicas -----
  router.post('/:pacienteId/condicoes-cronicas', ...ubsWrite, c.postAddCondicao);
  router.patch('/:pacienteId/condicoes-cronicas/:id', ...ubsWrite, c.patchCondicao);
  router.delete('/:pacienteId/condicoes-cronicas/:id', ...ubsDelete, c.deleteCondicao);

  // ----- Medicamentos -----
  router.post('/:pacienteId/medicamentos', ...ubsWrite, c.postAddMedicamento);
  router.patch('/:pacienteId/medicamentos/:id', ...ubsWrite, c.patchMedicamento);
  router.delete('/:pacienteId/medicamentos/:id', ...ubsDelete, c.deleteMedicamento);

  // ----- Histórico familiar (substituição total) -----
  router.put('/:pacienteId/historico-familiar', ...ubsWrite, c.putHistoricoFamiliar);

  // ----- Atendimentos (SOAP) -----
  router.post('/:pacienteId/atendimentos', ...ubsWrite, c.postAddAtendimento);
  router.delete('/:pacienteId/atendimentos/:id', ...ubsDelete, c.deleteAtendimento);

  // ----- Exames -----
  router.post('/:pacienteId/exames', ...ubsWrite, c.postAddExame);
  router.delete('/:pacienteId/exames/:id', ...ubsDelete, c.deleteExame);

  // ----- Vacinação -----
  router.post('/:pacienteId/vacinacoes', ...ubsWrite, c.postAddVacina);
  router.delete('/:pacienteId/vacinacoes/:id', ...ubsDelete, c.deleteVacina);

  // ----- Viagens TFD (escopo da regulação/gestão TFD) -----
  router.post('/:pacienteId/viagens', ...viagemTfdWrite, c.postAddViagem);
  router.patch('/:pacienteId/viagens/:id', ...viagemTfdWrite, c.patchViagem);
  router.delete('/:pacienteId/viagens/:id', ...viagemTfdDelete, c.deleteViagem);

  return router;
}
