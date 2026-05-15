import { z } from 'zod';

// Datas:
// - `ymd` = data de calendário (sem hora) → YYYY-MM-DD.
// - `iso` = timestamp completo (ISO 8601). Aceita também o output do
//   <input type="datetime-local"> (YYYY-MM-DDTHH:MM) — frontend usa.
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use formato YYYY-MM-DD');
const iso = z.string().min(10);

// CID-10: 1 letra + 2 dígitos + opcional `.X[+]` onde X+ é alfanumérico.
// Ex.: I10 · E11.9 · M16.0 · A41.51 · Z00.
const CID10_REGEX = /^[A-Z][0-9]{2}(\.[0-9A-Z]+)?$/;
const cid10 = z.string().regex(CID10_REGEX, 'CID-10 inválido (ex.: I10, E11.9, M16.0)');

// ----- Alergias -----
export const addAlergiaSchema = z.object({
  substancia: z.string().trim().min(1).max(200),
  tipo: z.enum(['MEDICAMENTO', 'ALIMENTO', 'AMBIENTAL', 'OUTRO']),
  gravidade: z.enum(['LEVE', 'MODERADA', 'GRAVE']),
  observacao: z.string().max(1000).optional(),
});

// ----- Condições crônicas -----
export const addCondicaoCronicaSchema = z.object({
  cid10,
  descricao: z.string().trim().min(1).max(300),
  desde: ymd,
  ativo: z.boolean().optional(),
  observacao: z.string().max(1000).optional(),
});

export const updateCondicaoCronicaSchema = z
  .object({
    descricao: z.string().trim().min(1).max(300).optional(),
    ativo: z.boolean().optional(),
    observacao: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (v) => v.descricao !== undefined || v.ativo !== undefined || v.observacao !== undefined,
    'Informe ao menos um campo',
  );

// ----- Medicamentos -----
export const addMedicamentoSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  dosagem: z.string().trim().min(1).max(100),
  frequencia: z.string().trim().min(1).max(100),
  desde: ymd,
  prescritor: z.string().trim().min(1).max(200),
  ativo: z.boolean().optional(),
});

export const updateMedicamentoSchema = z
  .object({
    ativo: z.boolean().optional(),
    dosagem: z.string().trim().min(1).max(100).optional(),
    frequencia: z.string().trim().min(1).max(100).optional(),
    prescritor: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (v) =>
      v.ativo !== undefined ||
      v.dosagem !== undefined ||
      v.frequencia !== undefined ||
      v.prescritor !== undefined,
    'Informe ao menos um campo',
  );

// ----- Histórico familiar -----
// Cada item: trim ≥ 1, ≤ 200, sem quebra de linha. Lista ≤ 50.
const itemHistoricoFamiliar = z
  .string()
  .max(200)
  .refine((s) => s.trim().length > 0, 'Item do histórico familiar não pode ser vazio')
  .refine((s) => !/[\r\n]/.test(s), 'Item do histórico familiar não pode conter quebra de linha');

export const setHistoricoFamiliarSchema = z.object({
  itens: z.array(itemHistoricoFamiliar).max(50, 'Máximo de 50 itens no histórico familiar'),
});

// ----- Atendimentos (SOAP) -----
// `cid10` é OPCIONAL conforme spec §6.1 (não é todo atendimento que tem CID).
export const addAtendimentoSchema = z.object({
  data: iso,
  tipo: z.enum([
    'CONSULTA_MEDICA',
    'ENFERMAGEM',
    'VACINACAO',
    'CURATIVO',
    'ODONTOLOGICO',
    'PROCEDIMENTO',
    'ACOLHIMENTO',
  ]),
  profissional: z.string().trim().min(3).max(200),
  registroProfissional: z.string().trim().min(1).max(50),
  especialidade: z.string().trim().min(1).max(100),
  unidade: z.string().trim().min(1).max(200),
  queixaPrincipal: z.string().trim().min(3).max(2000),
  diagnostico: z.string().trim().min(1).max(2000).optional(),
  cid10: cid10.optional(),
  conduta: z.string().trim().min(3).max(4000),
  prescricaoResumo: z.string().max(4000).optional(),
});

// ----- Exames -----
// Spec §7: data é YYYY-MM-DD (calendário) — não pode ser futura.
export const addExameSchema = z.object({
  data: ymd,
  tipo: z.string().trim().min(1).max(200),
  categoria: z.enum(['LABORATORIAL', 'IMAGEM', 'FUNCIONAL', 'OUTROS']),
  solicitante: z.string().trim().min(1).max(200),
  unidadeExecutora: z.string().trim().min(1).max(200),
  resultado: z.enum(['NORMAL', 'ALTERADO', 'CRITICO', 'PENDENTE']),
  observacao: z.string().max(2000).optional(),
});

// ----- Vacinas -----
// Spec §8: data é YYYY-MM-DD; unique (paciente, vacina, dose, lote).
export const addVacinaSchema = z.object({
  data: ymd,
  vacina: z.string().trim().min(1).max(200),
  dose: z.string().trim().min(1).max(50),
  lote: z.string().trim().min(1).max(100),
  aplicador: z.string().trim().min(1).max(200),
  unidade: z.string().trim().min(1).max(200),
  via: z.enum(['INTRAMUSCULAR', 'SUBCUTANEA', 'ORAL', 'INTRADERMICA']),
});

// ----- Viagens TFD (sub-doc do prontuário) -----
// Spec §9.1: dataIda/dataVolta YYYY-MM-DD; protocolo OBRIGATÓRIO único por
// prefeitura. Backend mantém compat: se request omitir `protocolo`, o use
// case auto-gera `TFD-YYYY-NNNNNN` (legado).
export const addViagemTfdSchema = z.object({
  protocolo: z.string().trim().min(3).max(40).optional(),
  dataIda: ymd,
  dataVolta: ymd,
  destino: z.string().trim().min(1).max(200),
  unidadeDestino: z.string().trim().min(1).max(200),
  motivo: z.string().trim().min(1).max(1000),
  especialidade: z.string().trim().min(1).max(100),
  acompanhante: z.boolean(),
  transporte: z.enum(['VAN_SMS', 'AMBULANCIA', 'PASSAGEM_RODOVIARIA', 'PASSAGEM_AEREA']),
  status: z.enum(['AGENDADA', 'EM_ANDAMENTO', 'REALIZADA', 'CANCELADA']).optional(),
  custoEstimadoBRL: z.number().nonnegative().optional(),
});

export const updateViagemTfdSchema = z
  .object({
    status: z.enum(['AGENDADA', 'EM_ANDAMENTO', 'REALIZADA', 'CANCELADA']).optional(),
    dataIda: ymd.optional(),
    dataVolta: ymd.optional(),
    destino: z.string().trim().min(1).max(200).optional(),
    unidadeDestino: z.string().trim().min(1).max(200).optional(),
    motivo: z.string().trim().min(1).max(1000).optional(),
    especialidade: z.string().trim().min(1).max(100).optional(),
    acompanhante: z.boolean().optional(),
    transporte: z.enum(['VAN_SMS', 'AMBULANCIA', 'PASSAGEM_RODOVIARIA', 'PASSAGEM_AEREA']).optional(),
    custoEstimadoBRL: z.number().nonnegative().optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    'Informe ao menos um campo',
  );

// ----- PATCH /v1/pacientes/:id (cadastro do paciente) -----
// Spec §4: imutáveis — cpf, cartaoSus, ubsId, prefeituraId.
// Validações:
//   - email regex (z.string().email())
//   - cep: 8 dígitos (aceita "00000-000" → normaliza)
//   - uf: 2 letras maiúsculas
//   - dataNascimento: YYYY-MM-DD, não futura (1900..ano atual)
const UFS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ',
  'RN','RO','RR','RS','SC','SE','SP','TO',
] as const;

const cepSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (use 8 dígitos)')
  .transform((s) => s.replace(/\D/g, ''));

const ufSchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .refine((s) => (UFS_BR as readonly string[]).includes(s), 'UF inválida');

const dataNascimentoSchema = ymd.refine((v) => {
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const ano = d.getUTCFullYear();
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return ano >= 1900 && d.getTime() <= hojeUTC;
}, 'Data de nascimento inválida (deve ser entre 1900 e hoje)');

export const patchPacienteSchema = z
  .object({
    nome: z.string().trim().min(2).optional(),
    nomeSocial: z.string().nullable().optional(),
    dataNascimento: dataNascimentoSchema.optional(),
    sexo: z.enum(['M', 'F', 'OUTRO']).optional(),
    telefone: z.string().nullable().optional(),
    telefoneSecundario: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    nomeMae: z.string().nullable().optional(),
    nomePai: z.string().nullable().optional(),
    estadoCivil: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'OUTRO']).optional(),
    escolaridade: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    racaCor: z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADA']).optional(),
    endereco: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    municipio: z.string().nullable().optional(),
    uf: ufSchema.nullable().optional(),
    cep: cepSchema.nullable().optional(),
    grupoSanguineo: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NAO_INFORMADO']).optional(),
    historicoFamiliar: z.array(itemHistoricoFamiliar).max(50).optional(),
    agenteComunitario: z.string().nullable().optional(),
    microarea: z.string().nullable().optional(),
    equipeSaudeFamilia: z.string().nullable().optional(),
  })
  .strict(); // rejeita imutáveis (cpf, cartaoSus, ubsId, prefeituraId)
