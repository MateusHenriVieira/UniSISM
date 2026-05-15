import { NotFound } from '../../shared/errors';
import type { Encaminhamento } from '../../domain/entities/Encaminhamento';
import type { IEncaminhamentoRepository } from '../../domain/repositories/IEncaminhamentoRepository';
import type { AccessScope } from '../../shared/scope';

export class GetEncaminhamentoUseCase {
  constructor(private readonly repo: IEncaminhamentoRepository) {}

  async exec(id: string, scope: AccessScope): Promise<Encaminhamento> {
    const e = await this.repo.buscarPorId(id, scope);
    if (!e) throw NotFound('ENCAMINHAMENTO_NAO_ENCONTRADO', 'Encaminhamento não encontrado');
    return e;
  }
}
