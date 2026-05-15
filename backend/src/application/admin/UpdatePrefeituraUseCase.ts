/**
 * Edição de prefeitura (campos administrativos).
 *
 * Regras:
 *   - DESENVOLVEDOR pode editar qualquer prefeitura.
 *   - ADMIN pode editar apenas a própria prefeitura.
 *   - Campos editáveis: nome, municipio, uf, cnpj, ativa.
 *   - `ativa=false` desabilita novo cadastro de UBS/usuários nessa prefeitura
 *     (validação de roles existentes continua respeitando isolation).
 */
import type { Prisma } from '../../../generated/prisma';
import { Conflict, Forbidden, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import type { AccessScope } from '../../shared/scope';
import type { IAuditLogger } from '../../infrastructure/audit/PrismaAuditLogger';

export interface UpdatePrefeituraInput {
  nome?: string;
  municipio?: string;
  uf?: string;
  cnpj?: string | null;
  ativa?: boolean;
}

export class UpdatePrefeituraUseCase {
  constructor(private readonly audit?: IAuditLogger) {}

  async exec(
    scope: AccessScope,
    editorId: string,
    alvoId: string,
    input: UpdatePrefeituraInput,
  ): Promise<{ id: string; nome: string; ativa: boolean }> {
    const alvo = await prisma.prefeitura.findUnique({ where: { id: alvoId } });
    if (!alvo || alvo.deletadoEm) {
      throw NotFound('PREFEITURA_NAO_ENCONTRADA', 'Prefeitura não encontrada');
    }

    // Escopo
    if (scope.kind === 'PREFEITURA' && scope.prefeituraId !== alvo.id) {
      throw NotFound('PREFEITURA_NAO_ENCONTRADA', 'Prefeitura não encontrada');
    }
    if (scope.kind === 'UBS') {
      throw Forbidden('PERMISSAO_INSUFICIENTE', 'Escopo UBS não pode editar prefeitura');
    }

    if (input.cnpj !== undefined && input.cnpj !== null && input.cnpj !== alvo.cnpj) {
      const dup = await prisma.prefeitura.findUnique({ where: { cnpj: input.cnpj } });
      if (dup && dup.id !== alvoId) {
        throw Conflict('PREFEITURA_DUPLICADA', 'CNPJ já cadastrado');
      }
    }

    const data: Prisma.PrefeituraUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.municipio !== undefined) data.municipio = input.municipio;
    if (input.uf !== undefined) data.uf = input.uf;
    if (input.cnpj !== undefined) data.cnpj = input.cnpj;
    if (input.ativa !== undefined) data.ativa = input.ativa;

    const atualizada = await prisma.prefeitura.update({
      where: { id: alvoId },
      data,
    });

    await this.audit?.registrar({
      acao: 'EDITAR_PREFEITURA',
      recurso: 'Prefeitura',
      recursoId: alvoId,
      atendenteId: editorId,
      payload: { campos: Object.keys(data) },
    });

    return { id: atualizada.id, nome: atualizada.nome, ativa: atualizada.ativa };
  }
}
