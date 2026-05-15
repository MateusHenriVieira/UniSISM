import type { Request, Response } from 'express';
import { Unauthorized } from '../../shared/errors';
import type { GetProfileUseCase } from '../../application/perfil/GetProfileUseCase';
import type { ChangePasswordUseCase } from '../../application/perfil/ChangePasswordUseCase';
import type { RevokeOtherSessionsUseCase } from '../../application/perfil/RevokeOtherSessionsUseCase';

export class PerfilController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly revokeOthers: RevokeOtherSessionsUseCase,
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const perfil = await this.getProfile.exec(req.auth!.sub);
    res.json(perfil);
  };

  postChangePassword = async (req: Request, res: Response): Promise<void> => {
    await this.changePassword.exec(req.auth!.sub, req.body.senhaAtual, req.body.novaSenha);
    res.status(204).send();
  };

  postRevokeOthers = async (req: Request, res: Response): Promise<void> => {
    const sid = req.auth?.sid;
    if (!sid) throw Unauthorized('SESSAO_INDETERMINADA', 'Sessão atual indefinida');
    const out = await this.revokeOthers.exec(req.auth!.sub, sid);
    res.json(out);
  };
}
