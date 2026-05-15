/**
 * Controller único que agrupa todos os endpoints de CRUD de sub-documentos
 * do prontuário. Cada handler valida o payload via Zod, chama o use case e
 * devolve o `PacienteCompleto` atualizado.
 */
import type { Request, Response } from 'express';
import { paramString } from '../../../shared/http';
import { scopeFromRequest } from '../../../shared/requestScope';
import type {
  AddAlergiaUseCase,
  RemoveAlergiaUseCase,
} from '../application/alergias';
import type {
  AddCondicaoCronicaUseCase,
  UpdateCondicaoCronicaUseCase,
  RemoveCondicaoCronicaUseCase,
} from '../application/condicoes-cronicas';
import type {
  AddMedicamentoUseCase,
  UpdateMedicamentoUseCase,
  RemoveMedicamentoUseCase,
} from '../application/medicamentos';
import type { SetHistoricoFamiliarUseCase } from '../application/historico-familiar';
import type {
  AddAtendimentoUseCase,
  RemoveAtendimentoUseCase,
} from '../application/atendimentos';
import type { AddExameUseCase, RemoveExameUseCase } from '../application/exames';
import type { AddVacinaUseCase, RemoveVacinaUseCase } from '../application/vacinas';
import type {
  AddViagemTfdUseCase,
  UpdateViagemTfdUseCase,
  RemoveViagemTfdUseCase,
} from '../application/viagens-tfd';
import {
  addAlergiaSchema,
  addAtendimentoSchema,
  addCondicaoCronicaSchema,
  addExameSchema,
  addMedicamentoSchema,
  addVacinaSchema,
  addViagemTfdSchema,
  setHistoricoFamiliarSchema,
  updateCondicaoCronicaSchema,
  updateMedicamentoSchema,
  updateViagemTfdSchema,
} from './schemas';

export interface ProntuarioUseCases {
  addAlergia: AddAlergiaUseCase;
  removeAlergia: RemoveAlergiaUseCase;
  addCondicaoCronica: AddCondicaoCronicaUseCase;
  updateCondicaoCronica: UpdateCondicaoCronicaUseCase;
  removeCondicaoCronica: RemoveCondicaoCronicaUseCase;
  addMedicamento: AddMedicamentoUseCase;
  updateMedicamento: UpdateMedicamentoUseCase;
  removeMedicamento: RemoveMedicamentoUseCase;
  setHistoricoFamiliar: SetHistoricoFamiliarUseCase;
  addAtendimento: AddAtendimentoUseCase;
  removeAtendimento: RemoveAtendimentoUseCase;
  addExame: AddExameUseCase;
  removeExame: RemoveExameUseCase;
  addVacina: AddVacinaUseCase;
  removeVacina: RemoveVacinaUseCase;
  addViagemTfd: AddViagemTfdUseCase;
  updateViagemTfd: UpdateViagemTfdUseCase;
  removeViagemTfd: RemoveViagemTfdUseCase;
}

export class ProntuarioController {
  constructor(private readonly uc: ProntuarioUseCases) {}

  private ctx(req: Request): { ip: string | null; userAgent: string | null } {
    return { ip: req.ip ?? null, userAgent: req.header('user-agent') ?? null };
  }
  private pid(req: Request): string { return paramString(req, 'pacienteId'); }

  // ----- Alergias -----
  postAddAlergia = async (req: Request, res: Response): Promise<void> => {
    const body = addAlergiaSchema.parse(req.body ?? {});
    const out = await this.uc.addAlergia.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  deleteAlergia = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeAlergia.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Condições crônicas -----
  postAddCondicao = async (req: Request, res: Response): Promise<void> => {
    const body = addCondicaoCronicaSchema.parse(req.body ?? {});
    const out = await this.uc.addCondicaoCronica.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  patchCondicao = async (req: Request, res: Response): Promise<void> => {
    const body = updateCondicaoCronicaSchema.parse(req.body ?? {});
    const out = await this.uc.updateCondicaoCronica.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), body, this.ctx(req),
    );
    res.json(out);
  };

  deleteCondicao = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeCondicaoCronica.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Medicamentos -----
  postAddMedicamento = async (req: Request, res: Response): Promise<void> => {
    const body = addMedicamentoSchema.parse(req.body ?? {});
    const out = await this.uc.addMedicamento.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  patchMedicamento = async (req: Request, res: Response): Promise<void> => {
    const body = updateMedicamentoSchema.parse(req.body ?? {});
    const out = await this.uc.updateMedicamento.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), body, this.ctx(req),
    );
    res.json(out);
  };

  deleteMedicamento = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeMedicamento.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Histórico familiar -----
  putHistoricoFamiliar = async (req: Request, res: Response): Promise<void> => {
    const body = setHistoricoFamiliarSchema.parse(req.body ?? {});
    const out = await this.uc.setHistoricoFamiliar.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body.itens, this.ctx(req),
    );
    res.json(out);
  };

  // ----- Atendimentos -----
  postAddAtendimento = async (req: Request, res: Response): Promise<void> => {
    const body = addAtendimentoSchema.parse(req.body ?? {});
    const out = await this.uc.addAtendimento.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  deleteAtendimento = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeAtendimento.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Exames -----
  postAddExame = async (req: Request, res: Response): Promise<void> => {
    const body = addExameSchema.parse(req.body ?? {});
    const out = await this.uc.addExame.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  deleteExame = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeExame.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Vacinas -----
  postAddVacina = async (req: Request, res: Response): Promise<void> => {
    const body = addVacinaSchema.parse(req.body ?? {});
    const out = await this.uc.addVacina.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  deleteVacina = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeVacina.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };

  // ----- Viagens TFD -----
  postAddViagem = async (req: Request, res: Response): Promise<void> => {
    const body = addViagemTfdSchema.parse(req.body ?? {});
    const out = await this.uc.addViagemTfd.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), body, this.ctx(req),
    );
    res.status(201).json(out);
  };

  patchViagem = async (req: Request, res: Response): Promise<void> => {
    const body = updateViagemTfdSchema.parse(req.body ?? {});
    const out = await this.uc.updateViagemTfd.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), body, this.ctx(req),
    );
    res.json(out);
  };

  deleteViagem = async (req: Request, res: Response): Promise<void> => {
    const out = await this.uc.removeViagemTfd.exec(
      scopeFromRequest(req), req.auth!.sub, this.pid(req), paramString(req, 'id'), this.ctx(req),
    );
    res.json(out);
  };
}
