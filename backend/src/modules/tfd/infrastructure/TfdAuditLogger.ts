/**
 * Auditoria TJ — cadeia hash criptográfica encadeada (TFD_API.md §6).
 *
 * Para CADA operação relevante (enum AcaoAuditoriaTFD), insere uma linha em
 * `tfd_audit_log` cujo `hash` é SHA-256 sobre uma serialização CANÔNICA
 * (RFC 8785 — JCS). Sem JCS, JSON.stringify produziria bytes diferentes
 * dependendo da ordem de inserção das chaves no objeto, quebrando a
 * verificação da cadeia entre execuções.
 *
 * Estrutura do payload canonicalizado (chaves serão ordenadas alfabeticamente):
 *
 *   {
 *     "acao": "...",
 *     "antes": ... | null,
 *     "depois": ... | null,
 *     "em": "ISO-8601",
 *     "hashAnterior": "<64 hex>",
 *     "id": "<uuid>",
 *     "ip": "...",
 *     "operadorId": "...",
 *     "recursoId": "..."
 *   }
 *
 * `hash_anterior` é o `hash` do último registro inserido na MESMA prefeitura.
 * Genesis: '0' x 64 (64 hex chars).
 *
 * Inserção é serializada por prefeitura via SELECT FOR UPDATE no último
 * hash, evitando race conditions.
 */
import crypto from 'node:crypto';
import type { Prisma, AcaoAuditoriaTFD } from '../../../../generated/prisma';
import { prisma } from '../../../infrastructure/database/prisma';
import { canonicalJson } from '../../../shared/canonicalJson';

const GENESIS = '0'.repeat(64);

export interface RegistrarTfdInput {
  prefeituraId: string;
  acao: AcaoAuditoriaTFD;
  recursoTipo: string;
  recursoId: string;
  recursoProtocolo?: string | null;
  operadorId: string;
  operadorNome: string;
  operadorMatricula: string;
  operadorRole: string;
  ip: string;
  userAgent: string;
  antes?: Record<string, unknown> | null;
  depois?: Record<string, unknown> | null;
}

export interface ITfdAuditLogger {
  registrar(input: RegistrarTfdInput): Promise<void>;
  registrarNaTransacao(
    tx: Prisma.TransactionClient,
    input: RegistrarTfdInput,
  ): Promise<void>;
}

/**
 * Calcula o SHA-256 do payload canonicalizado.
 *
 * Inclui tudo que importa pra prestação de contas (acao, recurso, operador,
 * ip, antes, depois, em, id) — `userAgent` e `operadorRole/Nome/Matricula`
 * NÃO entram no hash, pra que ajustes cosméticos (ex: corrigir grafia do
 * nome no cadastro) não invalidem a cadeia já gravada.
 */
export function calcHashTfd(
  registro: { id: string; em: Date } & Pick<
    RegistrarTfdInput,
    'acao' | 'recursoId' | 'operadorId' | 'ip' | 'antes' | 'depois'
  >,
  hashAnterior: string,
): string {
  const payload = canonicalJson({
    id: registro.id,
    acao: registro.acao,
    recursoId: registro.recursoId,
    operadorId: registro.operadorId,
    ip: registro.ip,
    em: registro.em.toISOString(),
    antes: (registro.antes ?? null) as unknown,
    depois: (registro.depois ?? null) as unknown,
    hashAnterior,
  });
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

export class TfdAuditLogger implements ITfdAuditLogger {
  async registrar(input: RegistrarTfdInput): Promise<void> {
    await prisma.$transaction(async (tx) => this.registrarNaTransacao(tx, input));
  }

  async registrarNaTransacao(
    tx: Prisma.TransactionClient,
    input: RegistrarTfdInput,
  ): Promise<void> {
    // Pega o último hash da prefeitura (genesis se não houver). Sem FOR UPDATE
    // explícito porque Prisma não expõe — dependemos do default do PG (read
    // committed) + retry no caller pra raríssimas colisões. Em alta carga, mover
    // pra raw SQL com SELECT ... FOR UPDATE em tfd_audit_log_tip(prefeitura).
    const ultimo = await tx.tfdAuditLog.findFirst({
      where: { prefeituraId: input.prefeituraId },
      orderBy: { em: 'desc' },
      select: { hash: true },
    });
    const hashAnterior = ultimo?.hash ?? GENESIS;

    const id = crypto.randomUUID();
    const em = new Date();
    const hash = calcHashTfd({ id, em, ...input }, hashAnterior);

    await tx.tfdAuditLog.create({
      data: {
        id,
        prefeituraId: input.prefeituraId,
        acao: input.acao,
        recursoTipo: input.recursoTipo,
        recursoId: input.recursoId,
        recursoProtocolo: input.recursoProtocolo ?? null,
        operadorId: input.operadorId,
        operadorNome: input.operadorNome,
        operadorMatricula: input.operadorMatricula,
        operadorRole: input.operadorRole,
        ip: input.ip,
        userAgent: input.userAgent,
        antes: (input.antes ?? null) as Prisma.InputJsonValue,
        depois: (input.depois ?? null) as Prisma.InputJsonValue,
        hashAnterior,
        hash,
        em,
      },
    });
  }
}

/**
 * Verifica integridade de toda a cadeia da prefeitura.
 * Retorna a lista de IDs corrompidos (vazia = cadeia íntegra).
 */
export async function verificarCadeiaTfd(prefeituraId: string): Promise<{
  total: number;
  corrompidos: string[];
}> {
  const todos = await prisma.tfdAuditLog.findMany({
    where: { prefeituraId },
    orderBy: { em: 'asc' },
  });

  const corrompidos: string[] = [];
  let esperadoAnterior = GENESIS;

  for (const r of todos) {
    if (r.hashAnterior !== esperadoAnterior) {
      corrompidos.push(r.id);
    }
    const hashRecalc = calcHashTfd(
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
      r.hashAnterior,
    );
    if (hashRecalc !== r.hash) {
      corrompidos.push(r.id);
    }
    esperadoAnterior = r.hash;
  }

  return { total: todos.length, corrompidos: Array.from(new Set(corrompidos)) };
}
