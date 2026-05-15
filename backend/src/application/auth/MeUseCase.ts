import { NotFound } from '../../shared/errors';
import type { IAtendenteRepository } from '../../domain/repositories/IAtendenteRepository';
import { iniciais } from '../utils/iniciais';

export interface MeOutput {
  id: string;
  nome: string;
  matricula: string;
  iniciais: string;
  role: string;
  unidade: string | null;
  prefeitura: string | null;
  cargo: string;
  escopo: 'GLOBAL' | 'PREFEITURA' | 'UBS';
}

export class MeUseCase {
  constructor(private readonly atendentes: IAtendenteRepository) {}

  async exec(atendenteId: string): Promise<MeOutput> {
    const a = await this.atendentes.buscarPorId(atendenteId);
    if (!a) throw NotFound('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');

    const escopo: MeOutput['escopo'] =
      a.role === 'DESENVOLVEDOR'
        ? 'GLOBAL'
        : a.ubs
          ? 'UBS'
          : 'PREFEITURA';

    const prefeitura = a.ubs?.prefeitura?.nome ?? a.prefeitura?.nome ?? null;

    return {
      id: a.id,
      nome: a.nome,
      matricula: a.matricula,
      iniciais: iniciais(a.nome),
      role: a.role,
      unidade: a.ubs?.nome ?? null,
      prefeitura,
      cargo: a.cargo,
      escopo,
    };
  }
}
