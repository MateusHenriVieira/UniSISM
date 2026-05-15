import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ListPacientesUseCase } from '../../application/pacientes/ListPacientesUseCase';
import type { GetPacienteUseCase } from '../../application/pacientes/GetPacienteUseCase';
import type { UpdatePacienteUseCase } from '../../application/pacientes/UpdatePacienteUseCase';
import type { DeletePacienteUseCase } from '../../application/pacientes/DeletePacienteUseCase';
import type { BuscarPacientePorCpfUseCase } from '../../application/pacientes/BuscarPacientePorCpfUseCase';
import { paramString } from '../../shared/http';
import { scopeFromRequest } from '../../shared/requestScope';
import { patchPacienteSchema } from '../../modules/prontuario/presentation/schemas';

const listarSchema = z.object({
  q: z.string().optional(),
  filtro: z.enum(['COM_CRONICAS', 'COM_ENCAMINHAMENTOS', 'SEM_ATENDIMENTO_90D']).optional(),
  equipeId: z.string().optional(),
  microarea: z.string().optional(),
});

export class PacienteController {
  constructor(
    private readonly list: ListPacientesUseCase,
    private readonly getOne: GetPacienteUseCase,
    private readonly update: UpdatePacienteUseCase,
    private readonly remove: DeletePacienteUseCase,
    private readonly buscarPorCpf: BuscarPacientePorCpfUseCase,
  ) {}

  getPorCpf = async (req: Request, res: Response): Promise<void> => {
    const cpf = paramString(req, 'cpf');
    const out = await this.buscarPorCpf.exec(cpf, scopeFromRequest(req));
    res.json(out);
  };

  getList = async (req: Request, res: Response): Promise<void> => {
    const q = listarSchema.parse(req.query);
    const scope = scopeFromRequest(req);
    const lista = await this.list.exec({
      scope,
      ...(q.q ? { q: q.q } : {}),
      ...(q.filtro ? { filtro: q.filtro } : {}),
      ...(q.equipeId ? { equipeId: q.equipeId } : {}),
      ...(q.microarea ? { microarea: q.microarea } : {}),
    });
    res.json(lista);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const p = await this.getOne.exec(paramString(req, 'id'), scopeFromRequest(req));
    res.json(p);
  };

  patch = async (req: Request, res: Response): Promise<void> => {
    const body = patchPacienteSchema.parse(req.body ?? {});
    const out = await this.update.exec(
      scopeFromRequest(req),
      req.auth!.sub,
      paramString(req, 'id'),
      body,
    );
    res.json(out);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    await this.remove.exec(scopeFromRequest(req), req.auth!.sub, paramString(req, 'id'));
    res.status(204).send();
  };
}
