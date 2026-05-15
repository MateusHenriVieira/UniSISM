import type { Request, Response } from 'express';
import type { GetMetricsUseCase } from '../../application/dashboard/GetMetricsUseCase';
import { scopeFromRequest } from '../../shared/requestScope';

export class DashboardController {
  constructor(private readonly getMetrics: GetMetricsUseCase) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const metrics = await this.getMetrics.exec(scopeFromRequest(req));
    res.set('Cache-Control', 'public, max-age=30');
    res.json(metrics);
  };
}
