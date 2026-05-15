import { NotFound } from '../../shared/errors';
import type { PacienteCompleto } from '../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../domain/repositories/IPacienteRepository';
import type { AccessScope } from '../../shared/scope';

export class GetPacienteUseCase {
  constructor(private readonly repo: IPacienteRepository) {}

  async exec(id: string, scope: AccessScope): Promise<PacienteCompleto> {
    const p = await this.repo.buscarPorId(id, scope);
    if (!p) throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
    return p;
  }
}
