/**
 * Helpers compartilhados por todos os use cases do módulo prontuário.
 *
 * - `assertAcessoPaciente`: valida escopo (404 se fora do escopo, não 403 —
 *    pra não vazar existência de paciente de outra UBS/prefeitura).
 * - `carregarCompleto`: retorna PacienteCompleto atualizado via repo. Todos
 *    os use cases chamam isso no final pra retornar o shape canônico.
 * - `resolverAutor`: devolve autor (nome + papel pra audit) a partir do
 *    atendente logado.
 */
import { NotFound, Unprocessable } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { PacienteCompleto } from '../../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';

export interface AutorProntuario {
  id: string;
  nome: string;
  papel: string;
}

/**
 * Valida que o paciente existe e está no escopo do usuário. Retorna o ubsId e
 * prefeituraId pra quem quiser fazer auditoria enriquecida.
 */
export async function assertAcessoPaciente(
  pacienteId: string,
  scope: AccessScope,
): Promise<{ ubsId: string; prefeituraId: string }> {
  const p = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: {
      id: true,
      deletadoEm: true,
      ubsId: true,
      ubs: { select: { prefeituraId: true } },
    },
  });
  if (!p || p.deletadoEm) {
    throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
  }

  // Scope check — 404 (não 403) pra não vazar existência
  if (scope.kind === 'PREFEITURA' && p.ubs.prefeituraId !== scope.prefeituraId) {
    throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
  }
  if (scope.kind === 'UBS' && p.ubsId !== scope.ubsId) {
    throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado');
  }

  return { ubsId: p.ubsId, prefeituraId: p.ubs.prefeituraId };
}

/** Carrega o PacienteCompleto atualizado — sempre devolvido após mutações. */
export async function carregarCompleto(
  repo: IPacienteRepository,
  pacienteId: string,
  scope: AccessScope,
): Promise<PacienteCompleto> {
  const p = await repo.buscarPorId(pacienteId, scope);
  if (!p) {
    throw NotFound(
      'PACIENTE_NAO_ENCONTRADO',
      'Paciente não encontrado após a operação',
    );
  }
  return p;
}

/**
 * Resolve dados do autor pra gravar no audit log.
 * `autorPapel` é montado com role + nome da UBS quando aplicável.
 */
export async function resolverAutor(
  atendentes: IAtendenteRepository,
  atendenteId: string,
): Promise<AutorProntuario> {
  const a = await atendentes.buscarPorId(atendenteId);
  if (!a) throw NotFound('ATENDENTE_NAO_ENCONTRADO', 'Atendente não encontrado');
  const papel = a.ubs
    ? `${a.role} · ${a.ubs.nome}`
    : a.role === 'DESENVOLVEDOR'
      ? 'Desenvolvedor'
      : a.role === 'ADMIN'
        ? 'Admin'
        : a.role;
  return { id: a.id, nome: a.nome, papel };
}

/** Parse de data tolerante YYYY-MM-DD → Date UTC (ou lança). */
export function parseYmdObrigatorio(v: string, code: string, campo: string): Date {
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw Unprocessable(code, `Campo ${campo} inválido`);
  }
  return d;
}

/** Parse de datetime ISO obrigatório. */
export function parseIsoObrigatorio(v: string, code: string, campo: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw Unprocessable(code, `Campo ${campo} inválido`);
  }
  return d;
}
