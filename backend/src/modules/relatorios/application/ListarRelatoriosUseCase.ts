/**
 * Lista relatórios dos últimos 90 dias visíveis ao usuário.
 *
 * Regra de visibilidade:
 *   - Cada usuário vê os relatórios que ele próprio gerou
 *   - ADMIN vê todos da sua prefeitura
 *   - DESENVOLVEDOR vê tudo
 */
import { prisma } from '../../../infrastructure/database/prisma';
import type { Relatorio } from '../../../domain/entities/Relatorio';
import type { AccessScope } from '../../../shared/scope';

function periodoLegivel(ini: Date, fim: Date): string {
  return `${ini.toLocaleDateString('pt-BR')} – ${fim.toLocaleDateString('pt-BR')}`;
}

export class ListarRelatoriosUseCase {
  async exec(atendenteId: string, role: string, scope: AccessScope): Promise<Relatorio[]> {
    const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = { geradoEm: { gte: desde } };
    if (role === 'DESENVOLVEDOR') {
      // sem filtro adicional
    } else if (role === 'ADMIN' && scope.kind === 'PREFEITURA') {
      where['OR'] = [
        { atendenteId },
        { prefeituraId: scope.prefeituraId },
      ];
    } else {
      where['atendenteId'] = atendenteId;
    }

    const rows = await prisma.relatorio.findMany({
      where,
      orderBy: { geradoEm: 'desc' },
      take: 200,
    });

    return rows.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      periodo: periodoLegivel(r.periodoIni, r.periodoFim),
      formato: r.formato,
      geradoEm: r.geradoEm.toISOString(),
      tamanhoKb: r.tamanhoKb,
      status: r.status,
    }));
  }
}
