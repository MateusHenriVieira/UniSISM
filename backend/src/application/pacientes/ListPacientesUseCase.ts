import type { PacienteResumo } from '../../domain/entities/Paciente';
import type {
  FiltroPacienteEspecial,
  IPacienteRepository,
} from '../../domain/repositories/IPacienteRepository';
import type { AccessScope } from '../../shared/scope';

export interface ListPacientesInput {
  scope: AccessScope;
  q?: string;
  filtro?: FiltroPacienteEspecial;
  equipeId?: string;
  microarea?: string;
}

export class ListPacientesUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  exec(input: ListPacientesInput): Promise<PacienteResumo[]> {
    return this.repo.listar(input);
  }
}
