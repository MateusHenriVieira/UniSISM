/**
 * Edição de UBS.
 *
 * Regras:
 *   - DESENVOLVEDOR: qualquer UBS.
 *   - ADMIN: apenas UBSs da sua prefeitura.
 *   - Campos editáveis: nome, municipio, uf, endereco, cnes, ativa.
 *   - Mudar `prefeituraId` NÃO é permitido (UBS muda de prefeitura = outra unidade).
 */
import type { Prisma } from '../../../generated/prisma';
import { Conflict, NotFound } from '../../shared/errors';
import { prisma } from '../../infrastructure/database/prisma';
import { ensurePrefeituraAcessivel, type AccessScope } from '../../shared/scope';
import type { IAuditLogger } from '../../infrastructure/audit/PrismaAuditLogger';

export interface UpdateUbsInput {
  nome?: string;
  municipio?: string;
  uf?: string;
  endereco?: string | null;
  cnes?: string | null;
  ativa?: boolean;
}

export class UpdateUbsUseCase {
  constructor(private readonly audit?: IAuditLogger) {}

  async exec(
    scope: AccessScope,
    editorId: string,
    ubsId: string,
    input: UpdateUbsInput,
  ): Promise<{ id: string; nome: string; ativa: boolean }> {
    const alvo = await prisma.ubs.findUnique({ where: { id: ubsId } });
    if (!alvo || alvo.deletadoEm) {
      throw NotFound('UBS_NAO_ENCONTRADA', 'UBS não encontrada');
    }
    ensurePrefeituraAcessivel(scope, alvo.prefeituraId);

    if (input.cnes !== undefined && input.cnes !== null && input.cnes !== alvo.cnes) {
      const dup = await prisma.ubs.findUnique({ where: { cnes: input.cnes } });
      if (dup && dup.id !== ubsId) {
        throw Conflict('UBS_DUPLICADA', 'CNES já cadastrado');
      }
    }

    const data: Prisma.UbsUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome;
    if (input.municipio !== undefined) data.municipio = input.municipio;
    if (input.uf !== undefined) data.uf = input.uf;
    if (input.endereco !== undefined) data.endereco = input.endereco;
    if (input.cnes !== undefined) data.cnes = input.cnes;
    if (input.ativa !== undefined) data.ativa = input.ativa;

    const atualizada = await prisma.ubs.update({ where: { id: ubsId }, data });

    await this.audit?.registrar({
      acao: 'EDITAR_UBS',
      recurso: 'Ubs',
      recursoId: ubsId,
      atendenteId: editorId,
      payload: { campos: Object.keys(data), prefeituraId: alvo.prefeituraId },
    });

    return { id: atualizada.id, nome: atualizada.nome, ativa: atualizada.ativa };
  }
}
