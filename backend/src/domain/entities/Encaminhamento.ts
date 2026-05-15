/**
 * Tipos do agregado Encaminhamento — espelham o frontend (src/lib/domain/models/Encaminhamento.ts).
 * Fonte da verdade para o contrato HTTP. Não dependem de infra.
 */
export type StatusEncaminhamento =
  | 'RASCUNHO'
  | 'AGUARDANDO_REGULACAO'
  | 'PENDENCIA_DOCUMENTO'
  | 'APROVADO'
  | 'REJEITADO';

export type PrioridadeClinica = 'ELETIVA' | 'PRIORITARIA' | 'URGENTE' | 'EMERGENCIA';

export type SexoPaciente = 'M' | 'F' | 'OUTRO';

export interface Paciente {
  nome: string;
  cpf: string;
  cartaoSus: string;
  dataNascimento: string;
  sexo: SexoPaciente;
  telefone: string;
  endereco: string;
}

export interface SolicitacaoMedica {
  medicoSolicitante: string;
  crm: string;
  especialidadeSolicitada: string;
  cid10: string;
  cidDescricao: string;
  justificativaClinica: string;
  prioridade: PrioridadeClinica;
  dataSolicitacao: string;
}

export type TipoAnexo =
  | 'SOLICITACAO'
  | 'RG'
  | 'CPF'
  | 'CARTAO_SUS'
  | 'EXAME'
  | 'LAUDO'
  | 'RESPOSTA_SUS'
  | 'OUTRO';

export type StatusScanAnexo = 'PENDENTE' | 'LIMPO' | 'INFECTADO' | 'FALHOU';

export interface AnexoDocumento {
  id: string;
  nome: string;
  tipo: TipoAnexo;
  tamanhoKb: number;
  uploadEm: string;
  /** Status do scan de antivírus. Download só liberado em LIMPO. */
  scanStatus: StatusScanAnexo;
}

export type TipoEventoTimeline =
  | 'CRIADO'
  | 'DOCUMENTO_ANEXADO'
  | 'ENVIADO_REGULACAO'
  | 'PENDENCIA_REGISTRADA'
  | 'APROVADO'
  | 'REJEITADO'
  | 'AGENDADO'
  | 'OBSERVACAO'
  | 'RESPOSTA_SUS_RECEBIDA'
  | 'EDITADO';

export interface RespostaSUS {
  anexoId: string;
  observacao: string;
  registradoEm: string; // ISO 8601
  registradoPor: { id: string; nome: string; matricula: string };
}

export interface EventoTimeline {
  id: string;
  tipo: TipoEventoTimeline;
  titulo: string;
  descricao: string;
  autor: string;
  autorPapel: string;
  em: string;
}

export interface Encaminhamento {
  id: string;
  protocolo: string;
  paciente: Paciente;
  solicitacao: SolicitacaoMedica;
  anexos: AnexoDocumento[];
  status: StatusEncaminhamento;
  criadoEm: string;
  atualizadoEm: string;
  unidadeOrigem: string;
  atendenteResponsavel: string;
  timeline?: EventoTimeline[];
  observacoesRegulacao?: string;
  agendamentoPrevisto?: string | null;
  respostaSUS?: RespostaSUS | null;
}

export interface MetricasDashboard {
  encaminhamentosHoje: number;
  aguardandoRegulacao: number;
  pendenciasDocumento: number;
  aprovadosHoje: number;
  tempoMedioConsolidacaoSegundos: number;
  encaminhamentosSemana: number;
  /**
   * Aprovados que ainda não receberam a resposta oficial do SUS.
   * Usado pelo card "Enviados" no dashboard simplificado da Face 2.
   */
  enviadosAguardandoResposta: number;
  /**
   * Aprovados que já têm `respostaSusAnexoId` preenchido.
   * Usado pelo card "Respondidos" + atalho `/sms/respostas`.
   */
  respondidosTotal: number;
}

export interface ExtracaoPdfResultado {
  paciente: Paciente;
  solicitacao: SolicitacaoMedica;
  confiancaExtracao: number;
}
