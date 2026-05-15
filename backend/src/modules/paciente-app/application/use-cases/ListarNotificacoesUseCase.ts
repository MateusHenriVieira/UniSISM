import { prisma } from '../../../../infrastructure/database/prisma';
import { NotFound } from '../../../../shared/errors';

export interface NotificacaoDTO {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  encaminhamentoId: string | null;
  protocolo: string | null;
  payload: Record<string, unknown> | null;
  criadaEm: string;
  lidaEm: string | null;
}

export class ListarNotificacoesUseCase {
  async exec(contaId: string, apenasNaoLidas = false): Promise<NotificacaoDTO[]> {
    const rows = await prisma.notificacaoPaciente.findMany({
      where: {
        contaId,
        ...(apenasNaoLidas ? { lidaEm: null } : {}),
      },
      orderBy: { criadaEm: 'desc' },
      take: 100,
      include: {
        // pega protocolo via join leve
      },
    });

    // Mapear protocolo do encaminhamento
    const ids = rows.map((r) => r.encaminhamentoId).filter((x): x is string => !!x);
    const encs =
      ids.length > 0
        ? await prisma.encaminhamento.findMany({
            where: { id: { in: ids } },
            select: { id: true, protocolo: true },
          })
        : [];
    const mapa = new Map(encs.map((e) => [e.id, e.protocolo]));

    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      corpo: r.corpo,
      encaminhamentoId: r.encaminhamentoId,
      protocolo: r.encaminhamentoId ? mapa.get(r.encaminhamentoId) ?? null : null,
      payload: (r.payload as Record<string, unknown> | null) ?? null,
      criadaEm: r.criadaEm.toISOString(),
      lidaEm: r.lidaEm ? r.lidaEm.toISOString() : null,
    }));
  }

  async marcarLida(contaId: string, notificacaoId: string): Promise<void> {
    const r = await prisma.notificacaoPaciente.updateMany({
      where: { id: notificacaoId, contaId },
      data: { lidaEm: new Date() },
    });
    if (r.count === 0) throw NotFound('NOTIFICACAO_NAO_ENCONTRADA', 'Notificação não encontrada');
  }

  async marcarTodasLidas(contaId: string): Promise<{ atualizadas: number }> {
    const r = await prisma.notificacaoPaciente.updateMany({
      where: { contaId, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return { atualizadas: r.count };
  }

  async countNaoLidas(contaId: string): Promise<number> {
    return prisma.notificacaoPaciente.count({ where: { contaId, lidaEm: null } });
  }
}
