/**
 * Rotas da Face 2 (Regulação · SMS).
 *
 * Decisão: REGULADOR_SMS ou DESENVOLVEDOR
 * Leitura agregada (árvore): REGULADOR_SMS, ADMIN ou DESENVOLVEDOR
 *
 * Isolation por prefeitura aplicado dentro dos use cases via AccessScope.
 */
import { Router } from 'express';
import { makeAuthenticate } from '../../../../presentation/middlewares/authenticate';
import { requireRole } from '../../../../presentation/middlewares/requireRole';
import { memoryUpload } from '../../../../presentation/middlewares/uploads';
import type { ITokenService } from '../../../../domain/services/ITokenService';
import type { RegulacaoController } from '../controllers/RegulacaoController';

export function buildRegulacaoRoutes(
  tokens: ITokenService,
  controller: RegulacaoController,
): Router {
  const router = Router();
  const authenticate = makeAuthenticate(tokens);
  const onlyRegulador = requireRole('REGULADOR_SMS', 'DESENVOLVEDOR');
  const reguladorOuAdmin = requireRole('REGULADOR_SMS', 'ADMIN', 'DESENVOLVEDOR');

  // árvore (file-manager) — antes de :id pra não conflitar
  router.get(
    '/encaminhamentos/arvore',
    authenticate,
    reguladorOuAdmin,
    controller.getArvore,
  );

  router.post(
    '/encaminhamentos/:id/aprovar',
    authenticate,
    onlyRegulador,
    controller.aprovar,
  );

  router.post(
    '/encaminhamentos/:id/registrar-pendencia',
    authenticate,
    onlyRegulador,
    controller.registrarPendencia,
  );

  router.post(
    '/encaminhamentos/:id/rejeitar',
    authenticate,
    onlyRegulador,
    controller.rejeitar,
  );

  router.post(
    '/encaminhamentos/:id/resposta-sus',
    authenticate,
    onlyRegulador,
    memoryUpload.single('file'),
    controller.registrarRespostaSus,
  );

  return router;
}
