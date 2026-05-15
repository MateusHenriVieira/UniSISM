import { Unprocessable } from '../../shared/errors';
import type {
  Encaminhamento,
  Paciente,
  SolicitacaoMedica,
  TipoAnexo,
} from '../../domain/entities/Encaminhamento';
import type {
  IEncaminhamentoRepository,
  CriarEncaminhamentoInput,
  PacienteComplemento,
} from '../../domain/repositories/IEncaminhamentoRepository';
import type { IFileStorage } from '../../domain/services/IFileStorage';
import type { IAnexoScanner } from '../../infrastructure/scan/ClamavScanner';
import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/database/prisma';
import { PdfCompressor } from '../../infrastructure/services/PdfCompressor';
import {
  MENSAGENS,
  NotificacaoPacienteService,
} from '../../infrastructure/services/NotificacaoPacienteService';

export interface AnexoUpload {
  nomeOriginal: string;
  mimeType: string;
  buffer: Buffer;
  tipo: TipoAnexo;
}

export interface CreateEncaminhamentoInput {
  paciente: Paciente;
  pacienteComplemento?: PacienteComplemento;
  solicitacao: SolicitacaoMedica;
  ubsId: string;
  atendenteId: string;
  unidadeOrigem: string;
  atendenteResponsavel: string;
  solicitacaoPdf?: AnexoUpload;
  anexos: AnexoUpload[];
}

export class CreateEncaminhamentoUseCase {
  private readonly compressor = new PdfCompressor();
  private readonly notificacoes = new NotificacaoPacienteService();

  constructor(
    private readonly encaminhamentos: IEncaminhamentoRepository,
    private readonly storage: IFileStorage,
    private readonly scanner?: IAnexoScanner,
  ) {}

  private async talvezComprimir(
    nome: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<Buffer> {
    if (mimeType !== 'application/pdf') return buffer;
    try {
      const r = await this.compressor.comprimir(buffer);
      return r.buffer;
    } catch (err) {
      logger.warn({ err, nome }, 'falha ao comprimir PDF, salvando original');
      return buffer;
    }
  }

  async exec(input: CreateEncaminhamentoInput): Promise<Encaminhamento> {
    if (!input.paciente.cpf || !input.paciente.nome || !input.solicitacao.especialidadeSolicitada) {
      throw Unprocessable(
        'DADOS_OBRIGATORIOS_AUSENTES',
        'Faltam campos obrigatórios (CPF, nome ou especialidade)',
      );
    }

    const pasta = `encaminhamentos/${new Date().toISOString().slice(0, 7)}`;

    const anexosPersistidos: CriarEncaminhamentoInput['anexos'] = [];

    if (input.solicitacaoPdf) {
      const buf = await this.talvezComprimir(
        input.solicitacaoPdf.nomeOriginal,
        input.solicitacaoPdf.mimeType,
        input.solicitacaoPdf.buffer,
      );
      const arq = await this.storage.salvar({
        nomeOriginal: input.solicitacaoPdf.nomeOriginal,
        mimeType: input.solicitacaoPdf.mimeType,
        buffer: buf,
        pasta,
      });
      anexosPersistidos.push({
        nome: input.solicitacaoPdf.nomeOriginal,
        tipo: 'SOLICITACAO',
        tamanhoKb: arq.tamanhoKb,
        mimeType: input.solicitacaoPdf.mimeType,
        caminho: arq.caminho,
      });
    }

    for (const a of input.anexos) {
      const buf = await this.talvezComprimir(a.nomeOriginal, a.mimeType, a.buffer);
      const arq = await this.storage.salvar({
        nomeOriginal: a.nomeOriginal,
        mimeType: a.mimeType,
        buffer: buf,
        pasta,
      });
      anexosPersistidos.push({
        nome: a.nomeOriginal,
        tipo: a.tipo,
        tamanhoKb: arq.tamanhoKb,
        mimeType: a.mimeType,
        caminho: arq.caminho,
      });
    }

    const criado = await this.encaminhamentos.criar({
      paciente: input.paciente,
      ...(input.pacienteComplemento ? { pacienteComplemento: input.pacienteComplemento } : {}),
      solicitacao: input.solicitacao,
      ubsId: input.ubsId,
      atendenteId: input.atendenteId,
      unidadeOrigem: input.unidadeOrigem,
      atendenteResponsavel: input.atendenteResponsavel,
      anexos: anexosPersistidos,
    });

    // Scan AV dos anexos (fire-and-forget).
    if (this.scanner) {
      void this.escanearAnexosAsync(criado.id);
    }

    // Notificação pro app do paciente (fire-and-forget) — passa telefone/email
    // pra enriquecer/criar a PacienteConta automaticamente.
    void this.notificacoes
      .notificar({
        cpfPaciente: input.paciente.cpf,
        pacienteNome: input.paciente.nome,
        ...(input.paciente.telefone ? { pacienteTelefone: input.paciente.telefone } : {}),
        encaminhamentoId: criado.id,
        tipo: 'ENCAMINHAMENTO_CRIADO',
        ...MENSAGENS.encaminhamentoCriado(criado.protocolo, input.unidadeOrigem),
        payload: { protocolo: criado.protocolo, unidadeOrigem: input.unidadeOrigem },
      })
      .catch((err) => logger.warn({ err }, 'falha ao notificar paciente'));

    return criado;
  }

  private async escanearAnexosAsync(encaminhamentoId: string): Promise<void> {
    if (!this.scanner) return;
    try {
      const anexos = await prisma.anexoDocumento.findMany({
        where: { encaminhamentoId },
        select: { id: true, caminho: true },
      });
      for (const a of anexos) {
        try {
          await this.scanner.escanearEAtualizar(a.id, this.storage.caminhoAbsoluto(a.caminho));
        } catch (err) {
          logger.warn({ err, anexoId: a.id }, 'scan AV falhou');
        }
      }
    } catch (err) {
      logger.warn({ err, encaminhamentoId }, 'falha ao enfileirar scan AV');
    }
  }
}
