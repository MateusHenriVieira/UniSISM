/**
 * Metadata declarativa de cada TipoRelatorio — fonte única para:
 *   - roles autorizadas (§4.2)
 *   - escopo automático de filtragem de dados
 *   - colunas permitidas no output (§5 — minimização LGPD)
 *   - template de título
 *   - classificação de sensibilidade (marca d'água, opt-ins etc.)
 *
 * NUNCA usar SELECT * em data sources. A única verdade de colunas está aqui.
 */
import type { RoleAtendente } from '../../../../generated/prisma';
import type { TipoRelatorio } from '../../../domain/entities/Relatorio';

export type EscopoRelatorio =
  | 'SELF'        // atendente vê só o próprio registro (PRODUCAO_INDIVIDUAL)
  | 'UBS'         // Coordenador UBS vê sua UBS; SMS/Admin vê a prefeitura
  | 'PREFEITURA'; // Admin/Regulador SMS veem toda a prefeitura

export type ClassificacaoSensibilidade =
  | 'PUBLICO_INSTITUCIONAL' // agregados sem PII
  | 'USO_INTERNO'           // dados operacionais sem PII
  | 'RESTRITO'              // dados que expõem identidade (RH, financeiro)
  | 'CONFIDENCIAL';         // contém dados de saúde/PII (nominal busca ativa)

export interface TipoRelatorioMeta {
  tipo: TipoRelatorio;
  descricaoFinalidade: string; // Art. 7º I LGPD
  rolesPermitidas: RoleAtendente[];
  escopoPadrao: EscopoRelatorio;
  colunas: readonly string[];
  colunasOpcionaisNominais?: readonly string[]; // só aparecem se filtros.incluirNomes=true
  permiteNominal?: boolean;
  classificacao: ClassificacaoSensibilidade;
  marcaDagua?: boolean;
  tituloTemplate: (periodo: string) => string;
}

// DESENVOLVEDOR é adicionado a todas — tem acesso global por design
const DEV: RoleAtendente = 'DESENVOLVEDOR';

/** Tabela central. Single source of truth. */
export const META: Record<TipoRelatorio, TipoRelatorioMeta> = {
  FILA_REGULACAO: {
    tipo: 'FILA_REGULACAO',
    descricaoFinalidade:
      'Monitoramento operacional da fila de regulação municipal para apoio à decisão de gestão pública em saúde (LGPD art. 7º III).',
    rolesPermitidas: ['REGULADOR_SMS', 'ADMIN', DEV],
    escopoPadrao: 'PREFEITURA',
    colunas: ['protocolo', 'especialidade', 'prioridade', 'ubs_origem', 'data_entrada', 'tempo_em_fila_h', 'sla_status'],
    classificacao: 'USO_INTERNO',
    tituloTemplate: (p) => `Fila de Regulação · ${p}`,
  },
  ENCAMINHAMENTOS_POR_ESPECIALIDADE: {
    tipo: 'ENCAMINHAMENTOS_POR_ESPECIALIDADE',
    descricaoFinalidade:
      'Agregado estatístico de demanda por especialidade para planejamento de capacidade assistencial (LGPD art. 7º III).',
    rolesPermitidas: ['COORDENADOR_UBS', 'REGULADOR_SMS', 'ADMIN', DEV],
    escopoPadrao: 'UBS',
    colunas: ['especialidade', 'total', 'aprovados', 'rejeitados', 'pendencias', 'tempo_medio_dias'],
    classificacao: 'PUBLICO_INSTITUCIONAL',
    tituloTemplate: (p) => `Encaminhamentos por Especialidade · ${p}`,
  },
  PENDENCIAS_RESOLVIDAS: {
    tipo: 'PENDENCIAS_RESOLVIDAS',
    descricaoFinalidade:
      'Monitoramento de tempo médio de resolução de pendências documentais para melhoria de processo (LGPD art. 7º III).',
    rolesPermitidas: ['COORDENADOR_UBS', 'REGULADOR_SMS', 'ADMIN', DEV],
    escopoPadrao: 'UBS',
    colunas: ['protocolo', 'ubs_origem', 'registrada_em', 'resolvida_em', 'tempo_resolucao_horas', 'motivo_categoria'],
    classificacao: 'USO_INTERNO',
    tituloTemplate: (p) => `Pendências Resolvidas · ${p}`,
  },
  TFD_CUSTOS: {
    tipo: 'TFD_CUSTOS',
    descricaoFinalidade:
      'Controle financeiro de Tratamento Fora do Domicílio (TFD) para prestação de contas institucional.',
    rolesPermitidas: ['ADMIN', 'REGULADOR_SMS', DEV],
    escopoPadrao: 'PREFEITURA',
    colunas: ['protocolo', 'destino', 'especialidade', 'data_viagem', 'valor', 'status'],
    classificacao: 'RESTRITO',
    marcaDagua: true,
    tituloTemplate: (p) => `TFD · Custos · ${p}`,
  },
  VACINACAO_UBS: {
    tipo: 'VACINACAO_UBS',
    descricaoFinalidade:
      'Consolidado de doses aplicadas por UBS/campanha para indicadores de cobertura vacinal (LGPD art. 11º II).',
    rolesPermitidas: ['COORDENADOR_UBS', 'ADMIN', DEV],
    escopoPadrao: 'UBS',
    colunas: ['ubs', 'vacina', 'campanha', 'doses', 'faixa_etaria'],
    classificacao: 'PUBLICO_INSTITUCIONAL',
    tituloTemplate: (p) => `Vacinação UBS · ${p}`,
  },
  BUSCA_ATIVA: {
    tipo: 'BUSCA_ATIVA',
    descricaoFinalidade:
      'Localização de pacientes com atendimento pendente para busca ativa pela equipe ESF (LGPD art. 7º III + art. 11º II f).',
    rolesPermitidas: ['COORDENADOR_UBS', 'ADMIN', DEV],
    escopoPadrao: 'UBS',
    colunas: ['bairro', 'microarea', 'quantidade'],
    colunasOpcionaisNominais: ['nome', 'cartao_sus_mascarado', 'telefone_mascarado', 'endereco_bairro'],
    permiteNominal: true,
    classificacao: 'CONFIDENCIAL',
    marcaDagua: true,
    tituloTemplate: (p) => `Busca Ativa · ${p}`,
  },
  PRODUCAO_INDIVIDUAL: {
    tipo: 'PRODUCAO_INDIVIDUAL',
    descricaoFinalidade:
      'Indicadores de produtividade de atendentes para gestão de RH da Secretaria Municipal de Saúde.',
    rolesPermitidas: ['ATENDENTE_UBS', 'COORDENADOR_UBS', 'REGULADOR_SMS', 'ADMIN', DEV],
    escopoPadrao: 'SELF',
    colunas: ['atendente_nome', 'matricula', 'periodo', 'total_ingeridos', 'aprovados', 'pendencias', 'tempo_medio_m'],
    classificacao: 'RESTRITO',
    marcaDagua: true,
    tituloTemplate: (p) => `Produção Individual · ${p}`,
  },
};

export function podeGerar(role: RoleAtendente, tipo: TipoRelatorio): boolean {
  return META[tipo].rolesPermitidas.includes(role);
}
