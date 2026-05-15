import { z } from 'zod';

export const criarPrefeituraSchema = z.object({
  nome: z.string().min(2),
  municipio: z.string().min(2),
  uf: z.string().length(2),
  cnpj: z.string().optional(),
});

export const criarUbsSchema = z.object({
  nome: z.string().min(2),
  municipio: z.string().min(2),
  uf: z.string().length(2),
  prefeituraId: z.string().min(1),
  endereco: z.string().optional(),
  cnes: z.string().optional(),
});

export const roleEnum = z.enum([
  'DESENVOLVEDOR',
  'ADMIN',
  'COORDENADOR_UBS',
  'ATENDENTE_UBS',
  'REGULADOR_SMS',
  'GESTOR_TFD',
  'REGULADOR_TFD',
]);

export const criarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  matricula: z.string().min(3),
  cpf: z.string().min(11),
  senha: z.string().min(8),
  role: roleEnum,
  ubsId: z.string().optional(),
  prefeituraId: z.string().optional(),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
  funcao: z.string().optional(),
});

export const listarUsuariosQuerySchema = z.object({
  q: z.string().optional(),
  role: roleEnum.optional(),
  ubsId: z.string().optional(),
  prefeituraId: z.string().optional(),
  ativo: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const listarUbsQuerySchema = z.object({
  prefeituraId: z.string().optional(),
});

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
  funcao: z.string().optional(),
  ubsId: z.string().nullable().optional(),
  prefeituraId: z.string().nullable().optional(),
});

export const resetarSenhaSchema = z.object({
  novaSenha: z.string().min(8),
});

export const alterarAtivoSchema = z.object({
  ativo: z.boolean(),
});

// UBS usa o campo `ativa` (gênero) — frontend Spec §7.9.
export const alterarAtivaUbsSchema = z.object({
  ativa: z.boolean(),
});

export const atualizarPrefeituraSchema = z.object({
  nome: z.string().min(2).optional(),
  municipio: z.string().min(2).optional(),
  uf: z.string().length(2).optional(),
  cnpj: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
});

export const atualizarUbsSchema = z.object({
  nome: z.string().min(2).optional(),
  municipio: z.string().min(2).optional(),
  uf: z.string().length(2).optional(),
  endereco: z.string().nullable().optional(),
  cnes: z.string().nullable().optional(),
  ativa: z.boolean().optional(),
});
