import type { PacienteCompleto, PacienteResumo } from '../entities/Paciente';
import type { AccessScope } from '../../shared/scope';

export type FiltroPacienteEspecial =
  | 'COM_CRONICAS'
  | 'COM_ENCAMINHAMENTOS'
  | 'SEM_ATENDIMENTO_90D';

export interface ListarPacientesFiltro {
  scope: AccessScope;
  q?: string;
  filtro?: FiltroPacienteEspecial;
  equipeId?: string;
  microarea?: string;
}

export interface IPacienteRepository {
  listar(filtro: ListarPacientesFiltro): Promise<PacienteResumo[]>;
  buscarPorId(id: string, scope: AccessScope): Promise<PacienteCompleto | null>;
}
