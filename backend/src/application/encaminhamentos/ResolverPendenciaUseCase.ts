import { Unprocessable } from '../../shared/errors';
import type { Encaminhamento, TipoAnexo } from '../../domain/entities/Encaminhamento';
import type {
  IEncaminhamentoRepository,
  ResolverPendenciaInput,
} from '../../domain/repositories/IEncaminhamentoRepository';
import type { IFileStorage } from '../../domain/services/IFileStorage';
import type { AccessScope } from '../../shared/scope';
import { logger } from '../../infrastructure/logger';
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

export interface ResolverPendenciaUseCaseInput {
  id: string;
  scope: AccessScope;
  nota: string;
  autor: string;
  autorPapel: string;
  anexos: AnexoUpload[];
}

export class ResolverPendenciaUseCase {
  private readonly notificacoes = new NotificacaoPacienteService();

  constructor(
    private readonly repo: IEncaminhamentoRepository,
    private readonly storage: IFileStorage,
  ) {}

  async exec(input: ResolverPendenciaUseCaseInput): Promise<Encaminhamento> {
    if ((!input.nota || input.nota.trim().length === 0) && input.anexos.length === 0) {
      throw Unprocessable('NENHUMA_ACAO_FORNECIDA', 'Forneça uma nota ou ao menos um anexo');
    }

    const pasta = `encaminhamentos/pendencias/${new Date().toISOString().slice(0, 7)}`;
    const novosAnexos: ResolverPendenciaInput['novosAnexos'] = [];
    for (const a of input.anexos) {
      const arq = await this.storage.salvar({
        nomeOriginal: a.nomeOriginal,
        mimeType: a.mimeType,
        buffer: a.buffer,
        pasta,
      });
      novosAnexos.push({
        nome: a.nomeOriginal,
        tipo: a.tipo,
        tamanhoKb: arq.tamanhoKb,
        mimeType: a.mimeType,
        caminho: arq.caminho,
      });
    }

    const atualizado = await this.repo.resolverPendencia(input.id, input.scope, {
      nota: input.nota || 'Pendência respondida',
      autor: input.autor,
      autorPapel: input.autorPapel,
      novosAnexos,
    });

    void this.notificacoes
      .notificar({
        cpfPaciente: atualizado.paciente.cpf,
        pacienteNome: atualizado.paciente.nome,
        encaminhamentoId: atualizado.id,
        tipo: 'PENDENCIA_RESOLVIDA',
        ...MENSAGENS.pendenciaResolvida(atualizado.protocolo),
        payload: { protocolo: atualizado.protocolo },
      })
      .catch((err) => logger.warn({ err }, 'notificar PENDENCIA_RESOLVIDA falhou'));

    return atualizado;
  }
}
