/**
 * Tipos do agregado Paciente / PEC — espelham o frontend.
 * (src/lib/domain/models/Paciente.ts)
 */
export type Sexo = 'M' | 'F' | 'OUTRO';

export type GrupoSanguineo =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'NAO_INFORMADO';

export type EstadoCivil =
  | 'SOLTEIRO'
  | 'CASADO'
  | 'DIVORCIADO'
  | 'VIUVO'
  | 'UNIAO_ESTAVEL'
  | 'OUTRO';

export type RacaCor = 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | 'NAO_INFORMADA';

export interface Alergia {
  id: string;
  substancia: string;
  tipo: 'MEDICAMENTO' | 'ALIMENTO' | 'AMBIENTAL' | 'OUTRO';
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  observacao?: string;
}

export interface CondicaoCronica {
  id: string;
  cid10: string;
  descricao: string;
  desde: string;
  ativo: boolean;
  observacao?: string;
}

export interface MedicamentoEmUso {
  id: string;
  nome: string;
  dosagem: string;
  frequencia: string;
  desde: string;
  prescritor: string;
  ativo: boolean;
}

export type TipoAtendimento =
  | 'CONSULTA_MEDICA'
  | 'ENFERMAGEM'
  | 'VACINACAO'
  | 'CURATIVO'
  | 'ODONTOLOGICO'
  | 'PROCEDIMENTO'
  | 'ACOLHIMENTO';

export interface Atendimento {
  id: string;
  data: string;
  tipo: TipoAtendimento;
  profissional: string;
  registroProfissional: string;
  especialidade: string;
  unidade: string;
  queixaPrincipal: string;
  diagnostico: string;
  cid10: string;
  conduta: string;
  prescricaoResumo?: string;
}

export type StatusViagemTFD = 'AGENDADA' | 'REALIZADA' | 'CANCELADA' | 'EM_ANDAMENTO';

export interface ViagemTFD {
  id: string;
  protocolo: string;
  dataIda: string;
  dataVolta: string;
  destino: string;
  unidadeDestino: string;
  motivo: string;
  especialidade: string;
  acompanhante: boolean;
  transporte: 'VAN_SMS' | 'AMBULANCIA' | 'PASSAGEM_RODOVIARIA' | 'PASSAGEM_AEREA';
  status: StatusViagemTFD;
  custoEstimadoBRL: number;
}

export type ResultadoExame = 'NORMAL' | 'ALTERADO' | 'CRITICO' | 'PENDENTE';

export interface ExameRealizado {
  id: string;
  data: string;
  tipo: string;
  categoria: 'LABORATORIAL' | 'IMAGEM' | 'FUNCIONAL' | 'OUTROS';
  solicitante: string;
  unidadeExecutora: string;
  resultado: ResultadoExame;
  observacao?: string;
}

export interface VacinaAplicada {
  id: string;
  data: string;
  vacina: string;
  dose: string;
  lote: string;
  aplicador: string;
  unidade: string;
  via: 'INTRAMUSCULAR' | 'SUBCUTANEA' | 'ORAL' | 'INTRADERMICA';
}

export interface MedicoAtendente {
  nome: string;
  registro: string;
  especialidade: string;
  unidade: string;
  ultimaConsulta: string;
  totalConsultas: number;
}

export interface PacienteResumo {
  id: string;
  nome: string;
  nomeSocial?: string;
  cpf: string;
  cartaoSus: string;
  dataNascimento: string;
  sexo: Sexo;
  telefone: string;
  unidadeVinculada: string;
  equipeSaudeFamilia?: string;
  ultimoAtendimento?: string;
  condicoesCronicasAtivas: number;
  encaminhamentosAtivos: number;
  cadastradoEm: string;
}

export interface PacienteCompleto extends PacienteResumo {
  nomeMae: string;
  nomePai?: string;
  estadoCivil: EstadoCivil;
  escolaridade: string;
  profissao?: string;
  racaCor: RacaCor;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefoneSecundario?: string;
  email?: string;

  grupoSanguineo: GrupoSanguineo;
  alergias: Alergia[];
  condicoesCronicas: CondicaoCronica[];
  medicamentosEmUso: MedicamentoEmUso[];
  historicoFamiliar: string[];

  agenteComunitario?: string;
  microarea?: string;

  atendimentos: Atendimento[];
  viagensTFD: ViagemTFD[];
  exames: ExameRealizado[];
  vacinacoes: VacinaAplicada[];
  medicosAtendentes: MedicoAtendente[];
  encaminhamentosIds: string[];
}
