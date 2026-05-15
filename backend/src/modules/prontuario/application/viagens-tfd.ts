/**
 * Viagens TFD (Tratamento Fora do Domicílio) — workflow com transições de status:
 *
 *   AGENDADA ──[Iniciar]──→ EM_ANDAMENTO ──[Realizar]──→ REALIZADA
 *                 ↓                 ↓
 *              [Cancelar] ──────→ CANCELADA
 *
 * Estados terminais (REALIZADA, CANCELADA) não aceitam mais mudança. 422 se tentar.
 */
import { Conflict, NotFound, Unprocessable } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import type { AccessScope } from '../../../shared/scope';
import type { PacienteCompleto } from '../../../domain/entities/Paciente';
import type { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IProntuarioAuditLogger } from '../infrastructure/PrismaProntuarioAuditLogger';
import {
  assertAcessoPaciente,
  carregarCompleto,
  parseYmdObrigatorio,
  resolverAutor,
} from './_helpers';

export type TransporteTFD =
  | 'VAN_SMS'
  | 'AMBULANCIA'
  | 'PASSAGEM_RODOVIARIA'
  | 'PASSAGEM_AEREA';

export type StatusViagemTFD = 'AGENDADA' | 'EM_ANDAMENTO' | 'REALIZADA' | 'CANCELADA';

export interface AddViagemTfdInput {
  /**
   * Protocolo TFD. Quando informado, é usado e checado contra duplicata
   * dentro da prefeitura. Quando ausente, backend auto-gera no padrão
   * `TFD-AAAA-NNNNNN` (legado, mantido para compat).
   */
  protocolo?: string;
  dataIda: string;          // YYYY-MM-DD
  dataVolta: string;        // YYYY-MM-DD
  destino: string;
  unidadeDestino: string;
  motivo: string;
  especialidade: string;
  acompanhante: boolean;
  transporte: TransporteTFD;
  status?: StatusViagemTFD; // default AGENDADA
  custoEstimadoBRL?: number;
}

export interface UpdateViagemTfdInput {
  status?: StatusViagemTFD;
  dataIda?: string;
  dataVolta?: string;
  destino?: string;
  unidadeDestino?: string;
  motivo?: string;
  especialidade?: string;
  acompanhante?: boolean;
  transporte?: TransporteTFD;
  custoEstimadoBRL?: number;
}

/** Transições válidas. `from -> Set<to>`. */
const TRANSICOES: Record<StatusViagemTFD, Set<StatusViagemTFD>> = {
  AGENDADA: new Set<StatusViagemTFD>(['EM_ANDAMENTO', 'CANCELADA']),
  EM_ANDAMENTO: new Set<StatusViagemTFD>(['REALIZADA', 'CANCELADA']),
  REALIZADA: new Set<StatusViagemTFD>(),
  CANCELADA: new Set<StatusViagemTFD>(),
};

export class AddViagemTfdUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    input: AddViagemTfdInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const dataIda = parseYmdObrigatorio(input.dataIda, 'DATA_INVALIDA', 'dataIda');
    const dataVolta = parseYmdObrigatorio(input.dataVolta, 'DATA_INVALIDA', 'dataVolta');
    if (dataVolta.getTime() < dataIda.getTime()) {
      throw Unprocessable(
        'DATA_INVALIDA',
        'Data de volta não pode ser anterior à ida',
        { dataIda: input.dataIda, dataVolta: input.dataVolta },
      );
    }

    // Resolve protocolo:
    //   - Se vier no input → usa como-está e checa duplicata global (DB tem
    //     `protocolo @unique`).
    //   - Se omitido → auto-gera `TFD-AAAA-NNNNNN` via SequencialProtocolo.
    let protocolo: string;
    if (input.protocolo && input.protocolo.trim().length > 0) {
      protocolo = input.protocolo.trim();
      const dup = await prisma.viagemTFD.findUnique({
        where: { protocolo },
        select: { id: true, pacienteId: true },
      });
      if (dup) {
        throw Conflict(
          'ITEM_DUPLICADO',
          `Já existe viagem TFD com protocolo ${protocolo}`,
          { protocolo, viagemExistenteId: dup.id },
        );
      }
    } else {
      const ano = new Date().getUTCFullYear();
      const seq = await prisma.sequencialProtocolo.upsert({
        where: { chave: `TFD-${ano}` },
        create: { chave: `TFD-${ano}`, valor: 1 },
        update: { valor: { increment: 1 } },
      });
      protocolo = `TFD-${ano}-${String(seq.valor).padStart(6, '0')}`;
    }

    const novo = await prisma.viagemTFD.create({
      data: {
        protocolo,
        pacienteId,
        dataIda,
        dataVolta,
        destino: input.destino.trim(),
        unidadeDestino: input.unidadeDestino.trim(),
        motivo: input.motivo.trim(),
        especialidade: input.especialidade.trim(),
        acompanhante: input.acompanhante,
        transporte: input.transporte,
        status: input.status ?? 'AGENDADA',
        custoEstimadoBRL: input.custoEstimadoBRL ?? 0,
      },
      select: { id: true, protocolo: true },
    });

    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'ADD_VIAGEM_TFD',
      recursoId: novo.id,
      dados: { protocolo: novo.protocolo, ...input },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class UpdateViagemTfdUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    viagemId: string,
    input: UpdateViagemTfdInput,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.viagemTFD.findUnique({ where: { id: viagemId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('VIAGEM_NAO_ENCONTRADA', 'Viagem TFD não encontrada');
    }

    // Valida transição de status (spec §9.2)
    // AGENDADA → EM_ANDAMENTO|CANCELADA · EM_ANDAMENTO → REALIZADA|CANCELADA
    // CANCELADA → AGENDADA (reagendar) · REALIZADA → terminal
    if (input.status !== undefined && input.status !== atual.status) {
      const permitidas = TRANSICOES[atual.status as StatusViagemTFD];
      if (!permitidas.has(input.status)) {
        throw Unprocessable(
          'TRANSICAO_INVALIDA',
          `Transição de ${atual.status} → ${input.status} não permitida`,
          { de: atual.status, para: input.status },
        );
      }
    }

    // Resolve datas para validar dataVolta ≥ dataIda mesmo em PATCHs parciais
    const novaDataIda =
      input.dataIda !== undefined
        ? parseYmdObrigatorio(input.dataIda, 'DATA_INVALIDA', 'dataIda')
        : atual.dataIda;
    const novaDataVolta =
      input.dataVolta !== undefined
        ? parseYmdObrigatorio(input.dataVolta, 'DATA_INVALIDA', 'dataVolta')
        : atual.dataVolta;
    if (novaDataVolta.getTime() < novaDataIda.getTime()) {
      throw Unprocessable(
        'DATA_INVALIDA',
        'Data de volta não pode ser anterior à ida',
        { dataIda: novaDataIda.toISOString(), dataVolta: novaDataVolta.toISOString() },
      );
    }

    const data: Record<string, unknown> = {};
    if (input.status !== undefined) data['status'] = input.status;
    if (input.dataIda !== undefined) data['dataIda'] = novaDataIda;
    if (input.dataVolta !== undefined) data['dataVolta'] = novaDataVolta;
    if (input.destino !== undefined) data['destino'] = input.destino.trim();
    if (input.unidadeDestino !== undefined) data['unidadeDestino'] = input.unidadeDestino.trim();
    if (input.motivo !== undefined) data['motivo'] = input.motivo.trim();
    if (input.especialidade !== undefined) data['especialidade'] = input.especialidade.trim();
    if (input.acompanhante !== undefined) data['acompanhante'] = input.acompanhante;
    if (input.transporte !== undefined) data['transporte'] = input.transporte;
    if (input.custoEstimadoBRL !== undefined) data['custoEstimadoBRL'] = input.custoEstimadoBRL;

    await prisma.viagemTFD.update({ where: { id: viagemId }, data });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'UPDATE_VIAGEM_TFD',
      recursoId: viagemId,
      dados: {
        antes: {
          status: atual.status,
          dataIda: atual.dataIda.toISOString(),
          dataVolta: atual.dataVolta.toISOString(),
          destino: atual.destino,
          unidadeDestino: atual.unidadeDestino,
          custoEstimadoBRL: atual.custoEstimadoBRL,
        },
        depois: input,
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}

export class RemoveViagemTfdUseCase {
  constructor(
    private readonly repo: IPacienteRepository,
    private readonly atendentes: IAtendenteRepository,
    private readonly audit: IProntuarioAuditLogger,
  ) {}

  async exec(
    scope: AccessScope,
    autorId: string,
    pacienteId: string,
    viagemId: string,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ): Promise<PacienteCompleto> {
    await assertAcessoPaciente(pacienteId, scope);
    const autor = await resolverAutor(this.atendentes, autorId);

    const atual = await prisma.viagemTFD.findUnique({ where: { id: viagemId } });
    if (!atual || atual.pacienteId !== pacienteId) {
      throw NotFound('VIAGEM_NAO_ENCONTRADA', 'Viagem TFD não encontrada');
    }
    // Não permite excluir viagem REALIZADA — é registro histórico de custo SUS
    if (atual.status === 'REALIZADA') {
      throw Conflict(
        'VIAGEM_REALIZADA_IMUTAVEL',
        'Viagem REALIZADA não pode ser excluída (registro histórico)',
      );
    }

    await prisma.viagemTFD.delete({ where: { id: viagemId } });
    await this.audit.registrar({
      pacienteId,
      autorId: autor.id,
      autorNome: autor.nome,
      autorPapel: autor.papel,
      acao: 'REMOVE_VIAGEM_TFD',
      recursoId: viagemId,
      dados: {
        protocolo: atual.protocolo,
        status: atual.status,
        destino: atual.destino,
        dataIda: atual.dataIda.toISOString(),
      },
      ip: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    });

    return carregarCompleto(this.repo, pacienteId, scope);
  }
}
