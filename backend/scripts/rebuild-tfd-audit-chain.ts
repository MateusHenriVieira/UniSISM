/**
 * Rebuild da cadeia hash de tfd_audit_log usando o algoritmo canonical RFC 8785.
 *
 * Para cada prefeitura, percorre os registros em ordem cronológica e recomputa
 * `hashAnterior` + `hash` segundo o novo algoritmo. NÃO altera os campos de
 * negócio (acao, recursoId, antes, depois, operadorId, ip, em) — só os
 * hashes, pra que /verificar passe a partir de agora.
 *
 * Uso (DEV):
 *   npx ts-node-dev --transpile-only scripts/rebuild-tfd-audit-chain.ts
 *
 * Em produção, rodar uma vez com janela de manutenção (e arquivar uma cópia
 * dos hashes antigos antes — esse script imprime um relatório por stderr).
 */
import { prisma } from '../src/infrastructure/database/prisma';
import { calcHashTfd } from '../src/modules/tfd/infrastructure/TfdAuditLogger';

const GENESIS = '0'.repeat(64);

async function rebuildPrefeitura(prefeituraId: string): Promise<{
  total: number;
  alterados: number;
}> {
  const registros = await prisma.tfdAuditLog.findMany({
    where: { prefeituraId },
    orderBy: { em: 'asc' },
    select: {
      id: true,
      em: true,
      acao: true,
      recursoId: true,
      operadorId: true,
      ip: true,
      antes: true,
      depois: true,
      hash: true,
      hashAnterior: true,
    },
  });

  let esperadoAnterior = GENESIS;
  let alterados = 0;

  for (const r of registros) {
    const novoHash = calcHashTfd(
      {
        id: r.id,
        em: r.em,
        acao: r.acao,
        recursoId: r.recursoId,
        operadorId: r.operadorId,
        ip: r.ip,
        antes: r.antes as Record<string, unknown> | null,
        depois: r.depois as Record<string, unknown> | null,
      },
      esperadoAnterior,
    );

    if (r.hash !== novoHash || r.hashAnterior !== esperadoAnterior) {
      await prisma.tfdAuditLog.update({
        where: { id: r.id },
        data: { hash: novoHash, hashAnterior: esperadoAnterior },
      });
      alterados++;
    }
    esperadoAnterior = novoHash;
  }

  return { total: registros.length, alterados };
}

async function main(): Promise<void> {
  const prefeituras = await prisma.tfdAuditLog.findMany({
    distinct: ['prefeituraId'],
    select: { prefeituraId: true },
  });

  if (prefeituras.length === 0) {
    console.log('[rebuild] sem registros a processar — cadeia vazia.');
    return;
  }

  console.log(`[rebuild] iniciando para ${prefeituras.length} prefeitura(s)`);
  let totGeral = 0;
  let altGeral = 0;
  for (const { prefeituraId } of prefeituras) {
    const { total, alterados } = await rebuildPrefeitura(prefeituraId);
    console.log(
      `[rebuild] prefeitura=${prefeituraId.slice(0, 8)}…  total=${total}  alterados=${alterados}`,
    );
    totGeral += total;
    altGeral += alterados;
  }
  console.log(
    `[rebuild] concluído. ${altGeral}/${totGeral} registros tiveram hash recomputado.`,
  );
}

main()
  .catch((err) => {
    console.error('[rebuild] erro:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
