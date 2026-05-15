import type { MetricasDashboard } from '../../domain/entities/Encaminhamento';
import type { IEncaminhamentoRepository } from '../../domain/repositories/IEncaminhamentoRepository';
import type { AccessScope } from '../../shared/scope';

export class GetMetricsUseCase {
  constructor(private readonly encaminhamentos: IEncaminhamentoRepository) {}

  exec(scope: AccessScope): Promise<MetricasDashboard> {
    return this.encaminhamentos.metricas(scope);
  }
}
