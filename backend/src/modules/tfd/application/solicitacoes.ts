/**
 * Solicitações TFD — fluxo de aprovação + anexos.
 *
 * Status: PENDENTE → APROVADA → ALOCADA → REALIZADA
 *                  ↘ NEGADA / CANCELADA
 */
import type { Request } from 'express';
import { BadRequest, Conflict, NotFound, Unprocessable } from '../../../shared/errors';
import { prisma } from '../../../infrastructure/database/prisma';
import { logger } from '../../../infrastructure/logger';
import type { AccessScope } from '../../../shared/scope';
import type { IAtendenteRepository } from '../../../domain/repositories/IAtendenteRepository';
import type { IFileStorage } from '../../../domain/services/IFileStorage';
import type { IAnexoScanner } from '../../../infrastructure/scan/ClamavScanner';
import type { ITfdAuditLogger } from '../infrastructure/TfdAuditLogger';
import {
  assertMesmaPrefeitura,
  ctxAudit,
  proximoProtocoloTfd,
  resolverOperador,
  resolverPrefeituraIdEfetiva,
} from './_helpers';

export interface DadosPacienteInline {
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: 'M' | 'F' | 'OUTRO';
  telefone: string;
  endereco: string;
  cartaoSus?: string;
  nomeMae?: string;
  rg?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface DadosAcompanhante {
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  parentesco:
    | 'CONJUGE'
    | 'FILHO_A'
    | 'PAI'
    | 'MAE'
    | 'IRMAO_A'
    | 'AVO'
    | 'NETO_A'
    | 'TIO_A'
    | 'SOBRINHO_A'
    | 'CUIDADOR'
    | 'OUTRO';
  rg?: string;
}

export interface CriarSolicitacaoInput {
  pacienteId?: string;
  paciente?: DadosPacienteInline;
  ubsId?: string;
  encaminhamentoOrigemId?: string;
  destino: string;
  unidadeDestino?: string;
  especialidade: string;
  motivo: string;
  dataDesejada: string; // YYYY-MM-DD
  acompanhanteNecessario?: boolean;
  acompanhante?: DadosAcompanhante;
  prioridade: 'ELETIVA' | 'PRIORITARIA' | 'URGENTE';
  observacoes?: string;
}

export interface AnexoUploadInput {
  nomeOriginal: string;
  mimeType: string;
  buffer: Buffer;
  tipo: 'COMPROVANTE_ENCAMINHAMENTO' | 'EXAME' | 'LAUDO' | 'OUTRO';
}

function rowParaSolicitacao(r: any) {
  return {
    id: r.id,
    protocolo: r.protocolo,
    pacienteId: r.pacienteId,
    pacienteNome: r.paciente?.nome ?? null,
    pacienteCpf: r.paciente?.cpf ?? null,
    ubsId: r.ubsId,
    ubsNome: r.ubs?.nome ?? null,
    encaminhamentoOrigemId: r.encaminhamentoOrigemId,
    destino: r.destino,
    unidadeDestino: r.unidadeDestino,
    especialidade: r.especialidade,
    motivo: r.motivo,
    dataDesejada: r.dataDesejada.toISOString().slice(0, 10),
    acompanhanteNecessario: r.acompanhanteNecessario,
    acompanhante: (r.acompanhante as DadosAcompanhante | null) ?? null,
    prioridade: r.prioridade,
    status: r.status,
    observacoes: r.observacoes,
    motivoNegacao: r.motivoNegacao,
    viagemId: r.viagemId,
    criadaEm: r.criadaEm.toISOString(),
    criadaPorId: r.criadaPorId ?? null,
    criadaPorNome: r.criadaPorNome ?? null,
    decididaEm: r.decididaEm?.toISOString() ?? null,
    decididaPorId: r.decididaPorId,
    anexos: (r.anexos ?? []).map((a: any) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanhoKb: a.tamanhoKb,
      scanStatus: a.scanStatus,
      uploadEm: a.uploadEm.toISOString(),
    })),
  };
}

const INCLUDE_FULL = {
  paciente: { select: { id: true, nome: true, cpf: true } },
  ubs: { select: { id: true, nome: true } },
  anexos: true,
};

const MIMES_ANEXO = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

export class SolicitacoesTfdUseCases {
  constructor(
    private readonly audit: ITfdAuditLogger,
    private readonly atendentes: IAtendenteRepository,
    private readonly storage: IFileStorage,
    private readonly scanner?: IAnexoScanner,
  ) {}

  async listar(
    scope: AccessScope,
    req: Request,
    filtros: { status?: string; prioridade?: string; q?: string; criadaPorMim?: boolean; autorId?: string },
  ) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const where: any = { prefeituraId, deletadaEm: null };
    if (filtros.status) where.status = filtros.status;
    if (filtros.prioridade) where.prioridade = filtros.prioridade;
    if (filtros.criadaPorMim && filtros.autorId) {
      where.criadaPorId = filtros.autorId;
    }
    if (filtros.q && filtros.q.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { protocolo: { contains: q, mode: 'insensitive' } },
        { destino: { contains: q, mode: 'insensitive' } },
        { especialidade: { contains: q, mode: 'insensitive' } },
        { paciente: { nome: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const rows = await prisma.solicitacaoTFD.findMany({
      where,
      include: INCLUDE_FULL,
      orderBy: { criadaEm: 'desc' },
      take: 200,
    });
    return rows.map(rowParaSolicitacao);
  }

  async porId(scope: AccessScope, id: string) {
    const r = await prisma.solicitacaoTFD.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!r || r.deletadaEm) throw NotFound('SOLICITACAO_NAO_ENCONTRADA', 'Solicitação não encontrada');
    assertMesmaPrefeitura(scope, r.prefeituraId);
    return rowParaSolicitacao(r);
  }

  async criar(scope: AccessScope, req: Request, autorId: string, input: CriarSolicitacaoInput) {
    const prefeituraId = resolverPrefeituraIdEfetiva(scope, req);
    const op = await resolverOperador(this.atendentes, autorId, prefeituraId);

    // XOR paciente / pacienteId — códigos canônicos do v0.10
    if (!input.paciente && !input.pacienteId) {
      throw BadRequest(
        'PACIENTE_OU_ID_OBRIGATORIO',
        'Informe `paciente` (cadastro inline) ou `pacienteId` (já cadastrado)',
      );
    }
    if (input.paciente && input.pacienteId) {
      throw BadRequest(
        'PACIENTE_E_ID_CONFLITAM',
        '`paciente` e `pacienteId` não podem ser informados juntos',
      );
    }
    if (input.acompanhanteNecessario === true && !input.acompanhante) {
      throw BadRequest(
        'ACOMPANHANTE_OBRIGATORIO',
        '`acompanhante` é obrigatório quando `acompanhanteNecessario=true`',
      );
    }

    // Resolve UBS — opcional para REGULADOR_TFD; se não informado, fallback
    // para a primeira UBS ativa da prefeitura (paciente inline precisa de uma).
    let ubsId: string | null = null;
    if (input.ubsId) {
      const ubs = await prisma.ubs.findUnique({
        where: { id: input.ubsId },
        select: { id: true, prefeituraId: true, ativa: true },
      });
      if (!ubs || ubs.prefeituraId !== prefeituraId) {
        throw NotFound('UBS_NAO_ENCONTRADA', 'UBS não encontrada na prefeitura');
      }
      ubsId = ubs.id;
    }

    // Resolve paciente: existente OU upsert por CPF (mescla campos vazios)
    let pacienteId: string;
    if (input.pacienteId) {
      const pac = await prisma.paciente.findUnique({
        where: { id: input.pacienteId },
        include: { ubs: { select: { prefeituraId: true } } },
      });
      if (!pac || pac.ubs.prefeituraId !== prefeituraId) {
        throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado na prefeitura');
      }
      pacienteId = pac.id;
    } else {
      pacienteId = await this.upsertPacienteInline(input.paciente!, prefeituraId, ubsId);
      // Se a UBS não foi informada, usa a UBS do paciente recém-resolvido
      if (!ubsId) {
        const pac = await prisma.paciente.findUnique({
          where: { id: pacienteId },
          select: { ubsId: true, ubs: { select: { prefeituraId: true } } },
        });
        if (pac && pac.ubs.prefeituraId === prefeituraId) {
          ubsId = pac.ubsId;
        }
      }
    }

    const protocolo = await proximoProtocoloTfd('TFD');
    const novo = await prisma.solicitacaoTFD.create({
      data: {
        protocolo,
        prefeituraId,
        pacienteId,
        ubsId,
        encaminhamentoOrigemId: input.encaminhamentoOrigemId ?? null,
        destino: input.destino.trim(),
        unidadeDestino: input.unidadeDestino?.trim() || null,
        especialidade: input.especialidade.trim(),
        motivo: input.motivo.trim(),
        dataDesejada: new Date(`${input.dataDesejada}T00:00:00.000Z`),
        acompanhanteNecessario: input.acompanhanteNecessario ?? false,
        acompanhante: input.acompanhante ? (input.acompanhante as any) : null,
        prioridade: input.prioridade,
        observacoes: input.observacoes?.trim() || null,
        criadaPorId: op.id,
        criadaPorNome: op.nome,
      },
      include: INCLUDE_FULL,
    });

    await this.audit.registrar({
      prefeituraId,
      acao: 'SOLICITACAO_CRIADA',
      recursoTipo: 'SOLICITACAO_TFD',
      recursoId: novo.id,
      recursoProtocolo: novo.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: {
        protocolo: novo.protocolo,
        destino: novo.destino,
        especialidade: novo.especialidade,
        prioridade: novo.prioridade,
        criadaPorId: op.id,
      },
    });

    return rowParaSolicitacao(novo);
  }

  /**
   * Upsert de paciente por CPF (Face 4 v0.10 — cadastro inline pelo REGULADOR_TFD).
   * Se já existir paciente com este CPF, mescla campos não-informados (preserva
   * dados clínicos existentes; atualiza apenas o que veio no payload).
   * Se não existir, cria vinculado à UBS informada (ou primeira ATIVA da prefeitura).
   */
  private async upsertPacienteInline(
    p: DadosPacienteInline,
    prefeituraId: string,
    ubsIdHint: string | null,
  ): Promise<string> {
    const existente = await prisma.paciente.findUnique({
      where: { cpf: p.cpf },
      include: { ubs: { select: { prefeituraId: true } } },
    });
    if (existente) {
      if (existente.ubs.prefeituraId !== prefeituraId) {
        // CPF já cadastrado em outra prefeitura — não é nosso paciente
        throw NotFound('PACIENTE_NAO_ENCONTRADO', 'Paciente não encontrado na prefeitura');
      }
      // Merge: preserva campos não-vazios já cadastrados, complementa com o payload
      const merge = (atual: string | null | undefined, novo: string | undefined) =>
        atual && atual.trim() ? atual : (novo?.trim() || null);
      await prisma.paciente.update({
        where: { id: existente.id },
        data: {
          nome: existente.nome?.trim() ? existente.nome : p.nome.trim(),
          telefone: merge(existente.telefone, p.telefone),
          endereco: merge(existente.endereco, p.endereco),
          cartaoSus: merge(existente.cartaoSus, p.cartaoSus),
          nomeMae: merge(existente.nomeMae, p.nomeMae),
          bairro: merge(existente.bairro, p.bairro),
          municipio: merge(existente.municipio, p.municipio),
          uf: merge(existente.uf, p.uf),
          cep: merge(existente.cep, p.cep),
        },
      });
      return existente.id;
    }

    // Novo paciente — precisa de uma UBS
    let ubsId = ubsIdHint;
    if (!ubsId) {
      const ubs = await prisma.ubs.findFirst({
        where: { prefeituraId, ativa: true },
        orderBy: { criadoEm: 'asc' },
        select: { id: true },
      });
      if (!ubs) {
        throw Unprocessable(
          'UBS_OBRIGATORIA',
          'Prefeitura sem UBS ativa — informe `ubsId` para cadastrar paciente novo',
        );
      }
      ubsId = ubs.id;
    }
    const novo = await prisma.paciente.create({
      data: {
        nome: p.nome.trim(),
        cpf: p.cpf,
        dataNascimento: new Date(`${p.dataNascimento}T00:00:00.000Z`),
        sexo: p.sexo,
        telefone: p.telefone.trim(),
        endereco: p.endereco.trim(),
        cartaoSus: p.cartaoSus?.trim() || null,
        nomeMae: p.nomeMae?.trim() || null,
        bairro: p.bairro?.trim() || null,
        municipio: p.municipio?.trim() || null,
        uf: p.uf?.trim() || null,
        cep: p.cep?.trim() || null,
        ubsId,
      },
      select: { id: true },
    });
    return novo.id;
  }

  async aprovar(
    scope: AccessScope,
    req: Request,
    autorId: string,
    id: string,
    observacoes: string | undefined,
    /** Se informado, faz aprovar + alocar atomicamente. */
    alocacao?: { viagemId: string; numeroAssento?: number },
  ) {
    const atual = await prisma.solicitacaoTFD.findUnique({ where: { id } });
    if (!atual || atual.deletadaEm) throw NotFound('SOLICITACAO_NAO_ENCONTRADA', 'Solicitação não encontrada');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    if (atual.status !== 'PENDENTE') {
      throw Conflict('STATUS_INVALIDO', `Só pode aprovar solicitação PENDENTE (atual: ${atual.status})`);
    }
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    // Se vier `alocacao`, valida viagem + assento ANTES de fazer qualquer escrita
    let viagemDaAlocacao: Awaited<ReturnType<typeof prisma.viagemFrota.findUnique>> = null;
    if (alocacao) {
      viagemDaAlocacao = await prisma.viagemFrota.findUnique({
        where: { id: alocacao.viagemId },
        include: { passageiros: { select: { numeroAssento: true } } } as any,
      });
      const v = viagemDaAlocacao as any;
      if (!v) throw NotFound('VIAGEM_NAO_ENCONTRADA', 'Viagem não encontrada');
      if (v.prefeituraId !== atual.prefeituraId) {
        throw NotFound('VIAGEM_NAO_ENCONTRADA', 'Viagem não encontrada');
      }
      if (v.status !== 'AGENDADA') {
        throw Conflict('VIAGEM_STATUS_INVALIDO', `Só pode alocar em viagem AGENDADA (atual: ${v.status})`);
      }
      if (v.passageiros.length >= v.vagasTotais) {
        throw Conflict('CAPACIDADE_EXCEDIDA', `Viagem cheia (${v.vagasTotais} vagas)`);
      }
      if (alocacao.numeroAssento !== undefined) {
        if (alocacao.numeroAssento < 1 || alocacao.numeroAssento > v.vagasTotais) {
          throw Unprocessable(
            'ASSENTO_INVALIDO',
            `Assento ${alocacao.numeroAssento} fora do intervalo [1..${v.vagasTotais}]`,
          );
        }
        const ocupado = v.passageiros.some(
          (p: { numeroAssento: number | null }) => p.numeroAssento === alocacao.numeroAssento,
        );
        if (ocupado) {
          throw Conflict('ASSENTO_OCUPADO', `Assento ${alocacao.numeroAssento} já está ocupado`);
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.solicitacaoTFD.update({
        where: { id },
        data: {
          status: alocacao ? 'ALOCADA' : 'APROVADA',
          observacoes: observacoes?.trim() || atual.observacoes,
          decididaEm: new Date(),
          decididaPorId: autorId,
          ...(alocacao ? { viagemId: alocacao.viagemId } : {}),
        },
        include: INCLUDE_FULL,
      });
      if (alocacao) {
        await tx.viagemPassageiro.create({
          data: {
            viagemId: alocacao.viagemId,
            solicitacaoId: id,
            pacienteId: atual.pacienteId,
            acompanhante: atual.acompanhanteNecessario,
            numeroAssento: alocacao.numeroAssento ?? null,
          },
        });
      }
      return upd;
    });

    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'SOLICITACAO_APROVADA',
      recursoTipo: 'SOLICITACAO_TFD',
      recursoId: id,
      recursoProtocolo: updated.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { status: atual.status },
      depois: {
        status: alocacao ? 'ALOCADA' : 'APROVADA',
        observacoes,
        ...(alocacao ? { alocacao } : {}),
      },
    });
    return rowParaSolicitacao(updated);
  }

  async negar(scope: AccessScope, req: Request, autorId: string, id: string, motivo: string) {
    const atual = await prisma.solicitacaoTFD.findUnique({ where: { id } });
    if (!atual || atual.deletadaEm) throw NotFound('SOLICITACAO_NAO_ENCONTRADA', 'Solicitação não encontrada');
    assertMesmaPrefeitura(scope, atual.prefeituraId);
    if (motivo.trim().length < 10) {
      throw Unprocessable('MOTIVO_OBRIGATORIO', 'Motivo da negação deve ter pelo menos 10 caracteres');
    }
    if (atual.status !== 'PENDENTE') {
      throw Conflict('STATUS_INVALIDO', `Só pode negar solicitação PENDENTE (atual: ${atual.status})`);
    }
    const op = await resolverOperador(this.atendentes, autorId, atual.prefeituraId);

    const updated = await prisma.solicitacaoTFD.update({
      where: { id },
      data: {
        status: 'NEGADA',
        motivoNegacao: motivo.trim(),
        decididaEm: new Date(),
        decididaPorId: autorId,
      },
      include: INCLUDE_FULL,
    });
    await this.audit.registrar({
      prefeituraId: atual.prefeituraId,
      acao: 'SOLICITACAO_NEGADA',
      recursoTipo: 'SOLICITACAO_TFD',
      recursoId: id,
      recursoProtocolo: updated.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      antes: { status: atual.status },
      depois: { status: 'NEGADA', motivoNegacao: motivo },
    });
    return rowParaSolicitacao(updated);
  }

  async anexarComprovante(
    scope: AccessScope,
    req: Request,
    autorId: string,
    solicitacaoId: string,
    upload: AnexoUploadInput,
  ) {
    const sol = await prisma.solicitacaoTFD.findUnique({ where: { id: solicitacaoId } });
    if (!sol || sol.deletadaEm) throw NotFound('SOLICITACAO_NAO_ENCONTRADA', 'Solicitação não encontrada');
    assertMesmaPrefeitura(scope, sol.prefeituraId);

    if (!MIMES_ANEXO.has(upload.mimeType)) {
      throw Unprocessable('MIME_NAO_SUPORTADO', 'Anexo deve ser PDF, JPEG ou PNG');
    }
    if (upload.buffer.length > MAX_BYTES) {
      throw Unprocessable('ARQUIVO_MUITO_GRANDE', 'Anexo excede 10 MB');
    }

    const op = await resolverOperador(this.atendentes, autorId, sol.prefeituraId);
    const pasta = `tfd/${sol.prefeituraId}/solicitacoes/${new Date().toISOString().slice(0, 7)}`;
    const arq = await this.storage.salvar({
      nomeOriginal: upload.nomeOriginal,
      mimeType: upload.mimeType,
      buffer: upload.buffer,
      pasta,
    });

    const anexo = await prisma.anexoSolicitacaoTFD.create({
      data: {
        solicitacaoId,
        nome: upload.nomeOriginal,
        tipo: upload.tipo,
        tamanhoKb: arq.tamanhoKb,
        storageKey: arq.caminho,
        uploadPorId: autorId,
      },
    });

    await this.audit.registrar({
      prefeituraId: sol.prefeituraId,
      acao: 'SOLICITACAO_ANEXO_ENVIADO',
      recursoTipo: 'SOLICITACAO_TFD',
      recursoId: solicitacaoId,
      recursoProtocolo: sol.protocolo,
      operadorId: op.id,
      operadorNome: op.nome,
      operadorMatricula: op.matricula,
      operadorRole: op.role,
      ...ctxAudit(req),
      depois: { anexoId: anexo.id, nome: anexo.nome, tipo: anexo.tipo, tamanhoKb: anexo.tamanhoKb },
    });

    // Scan AV fire-and-forget
    if (this.scanner) {
      void this.scanner
        .escanearEAtualizar(anexo.id, this.storage.caminhoAbsoluto(arq.caminho))
        .catch((err) => logger.warn({ err, anexoId: anexo.id }, 'scan TFD anexo falhou'));
    }

    return {
      id: anexo.id,
      nome: anexo.nome,
      tipo: anexo.tipo,
      tamanhoKb: anexo.tamanhoKb,
      scanStatus: anexo.scanStatus,
      uploadEm: anexo.uploadEm.toISOString(),
    };
  }

  async getCaminhoAnexoLiberado(scope: AccessScope, anexoId: string): Promise<{
    caminho: string;
    nome: string;
    mimeType: string;
  }> {
    const anexo = await prisma.anexoSolicitacaoTFD.findUnique({
      where: { id: anexoId },
      include: { solicitacao: { select: { prefeituraId: true } } },
    });
    if (!anexo) throw NotFound('ANEXO_NAO_ENCONTRADO', 'Anexo não encontrado');
    assertMesmaPrefeitura(scope, anexo.solicitacao.prefeituraId);

    if (anexo.scanStatus !== 'LIMPO') {
      throw Conflict('ANEXO_NAO_LIBERADO', 'Anexo ainda em scan ou bloqueado por segurança', {
        scanStatus: anexo.scanStatus,
      });
    }
    const mimeType = inferirMime(anexo.nome);
    return {
      caminho: this.storage.caminhoAbsoluto(anexo.storageKey),
      nome: anexo.nome,
      mimeType,
    };
  }
}

function inferirMime(nome: string): string {
  const ext = nome.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream';
}
