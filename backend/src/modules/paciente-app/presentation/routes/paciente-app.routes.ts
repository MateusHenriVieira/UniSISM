import { Router } from 'express';
import { authenticatePaciente } from '../middlewares/authenticatePaciente';
import type { PacienteAppController } from '../controllers/PacienteAppController';

export function buildPacienteAppRoutes(controller: PacienteAppController): Router {
  const router = Router();

  // públicos
  router.post('/auth/login', controller.postLogin);
  router.post('/auth/ativar-conta', controller.postAtivar);

  // autenticados
  router.post('/auth/logout', authenticatePaciente, controller.postLogout);
  router.post('/auth/trocar-senha', authenticatePaciente, controller.postTrocarSenha);
  router.get('/me', authenticatePaciente, controller.getMe);

  router.get('/meus-encaminhamentos', authenticatePaciente, controller.getMeusEncaminhamentos);

  router.get('/notificacoes', authenticatePaciente, controller.getNotificacoes);
  router.get('/notificacoes/count', authenticatePaciente, controller.getNotificacoesCount);
  router.post('/notificacoes/:id/lida', authenticatePaciente, controller.postMarcarLida);
  router.post('/notificacoes/marcar-todas-lidas', authenticatePaciente, controller.postMarcarTodasLidas);

  router.get('/anexos/:id/download', authenticatePaciente, controller.getDownloadAnexo);

  return router;
}
