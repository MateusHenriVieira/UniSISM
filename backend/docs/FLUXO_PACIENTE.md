# Fluxo do Paciente · novas funcionalidades

> Documento focado nas mudanças entregues em **24/04/2026**.
> Trata de: CPF normalizado, conta de app criada automaticamente, senha provisória,
> busca por CPF com campos faltantes, e cadastro incremental do paciente durante
> a consolidação do encaminhamento.
>
> Este arquivo substitui qualquer contrato anterior sobre "conta pendente"
> (`senhaHash = '!pending!'`) e sobre o comportamento "não atualiza nada" do
> upsert de paciente.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [CPF sempre normalizado](#2-cpf-sempre-normalizado)
3. [Auto-criação da conta do app](#3-auto-criação-da-conta-do-app)
4. [Troca de senha obrigatória no primeiro acesso](#4-troca-de-senha-obrigatória-no-primeiro-acesso)
5. [Busca por CPF + campos faltantes](#5-busca-por-cpf--campos-faltantes)
6. [Cadastro incremental (preencher só se vazio)](#6-cadastro-incremental-preencher-só-se-vazio)
7. [Edição direta do paciente (PATCH)](#7-edição-direta-do-paciente-patch)
8. [Fluxos ponta-a-ponta](#8-fluxos-ponta-a-ponta)
9. [Tipos TypeScript de referência](#9-tipos-typescript-de-referência)
10. [Checklist de migração do frontend](#10-checklist-de-migração-do-frontend)

---

## 1. Visão geral

O objetivo é **reduzir fricção** no cadastro do paciente sem perder dados:

- O atendente sobe o PDF → o backend já sabe se aquele CPF existe.
- Se existe mas está incompleto, o form só mostra **os campos que faltam**.
- Se existe e está completo, o form complementar **some**.
- A cada encaminhamento, o banco vai sendo enriquecido — **sem sobrescrever** o que já foi preenchido.
- O paciente pode logar no app **imediatamente** com CPF + CPF e troca a senha no primeiro acesso.

Nenhuma mudança quebra o contrato anterior para a Face 1/2 (UBS/SMS), exceto pelo ponto abaixo:

> ⚠️ **Breaking no fluxo da Face 3 (App do Paciente)**: o código de erro `403 CONTA_NAO_ATIVADA` foi removido do login. Contas sempre nascem ativas. Se o app tratava esse erro pra mandar pro `/ativar-conta`, remova. Substitua pela checagem `paciente.senhaProvisoria`.

---

## 2. CPF sempre normalizado

**Regra única**: em qualquer coluna de banco que armazene CPF, são gravados **só dígitos** (11 caracteres, sem pontuação).

Endpoints que recebem CPF continuam aceitando formatado **ou** só dígitos — a normalização é feita no backend. Na hora de devolver, o backend manda os dois:

```json
{ "cpf": "53474131826", "cpfFormatado": "534.741.318-26" }
```

Campos afetados:

| Tabela | Coluna | Valor |
|--------|--------|-------|
| `pacientes` | `cpf` | sempre dígitos |
| `encaminhamentos` | `pacienteCpf` | sempre dígitos |
| `pacientes_contas` | `cpf` | sempre dígitos |
| `pacientes_contas` | `cpfFormatado` | sempre com pontuação |

**Validação**: CPF com menos de 11 dígitos ao criar encaminhamento → `422 CPF_INVALIDO`.

**Por que isso importa pro frontend**: se você listava encaminhamentos filtrando por CPF formatado, troque pra comparar dígitos. O backend faz isso automaticamente quando o CPF é query param, mas se você faz match client-side, normalize com uma função equivalente a:

```ts
const digits = (cpf: string) => cpf.replace(/\D+/g, '');
```

---

## 3. Auto-criação da conta do app

Quando a UBS consolida o **primeiro encaminhamento** de um CPF que ainda não tem conta no app, o backend cria automaticamente a `PacienteConta` com:

```
cpf              = CPF digits
cpfFormatado     = CPF com pontuação
nome             = nome do paciente no encaminhamento
senhaHash        = bcrypt(CPF digits)    ← senha inicial é o próprio CPF
ativo            = true                   ← já nasce ativa
senhaProvisoria  = true                   ← flag pro app forçar troca de senha
```

O paciente pode logar **na hora** com:

```
POST /v1/paciente-app/auth/login
{ "cpf": "53474131826", "senha": "53474131826" }
```

(funciona com CPF formatado também, o backend normaliza)

### Diferença do comportamento anterior

| Antes | Agora |
|---|---|
| `senhaHash = '!pending!'`, `ativo = false` | `senhaHash = bcrypt(cpf)`, `ativo = true`, `senhaProvisoria = true` |
| Primeiro login → `403 CONTA_NAO_ATIVADA` | Primeiro login → `200` com `senhaProvisoria: true` |
| Paciente obrigado a chamar `/ativar-conta` | Paciente loga direto e troca a senha |

### Endpoint legado: `/auth/ativar-conta`

Continua funcionando mas **não é mais parte do fluxo principal**. Útil apenas se você quiser expor um fluxo de "recuperar senha por CPF + data de nascimento" futuramente.

---

## 4. Troca de senha obrigatória no primeiro acesso

### Novo endpoint

```http
POST /v1/paciente-app/auth/trocar-senha
Authorization: Bearer <token>
Content-Type: application/json

{ "senhaAtual": "53474131826", "novaSenha": "minhaSenhaForte123" }
```

**Response 204.** Após sucesso, o campo `senhaProvisoria` do usuário vira `false`.

**Erros:**
- `401 CREDENCIAIS_INVALIDAS` — senha atual errada
- `422 SENHA_FRACA` — nova senha com menos de 8 caracteres
- `422 SENHA_IGUAL_ATUAL` — nova senha é idêntica à atual

### UX recomendada no app

```dart
// pseudo-Flutter
final login = await api.pacienteApp.login(cpf: cpf, senha: senha);
if (login.paciente.senhaProvisoria) {
  // Redireciona pra tela de troca de senha BLOQUEANTE — não deixa navegar até trocar.
  // O texto recomendado pro usuário:
  //   "Essa é a primeira vez que você acessa o app. Por segurança, crie uma
  //    nova senha antes de continuar."
  Navigator.pushReplacement(context, TrocarSenhaObrigatoria(login: login));
  return;
}
Navigator.pushReplacement(context, HomePaciente(login: login));
```

O endpoint `GET /paciente-app/me` também retorna `senhaProvisoria`, então o app pode rechecar depois do deep-link ou do splash.

---

## 5. Busca por CPF + campos faltantes

### Novo endpoint

```http
GET /v1/pacientes/por-cpf/:cpf
Authorization: Bearer <token>
```

Este endpoint **não lança 404**. Ele sempre retorna o shape abaixo:

```ts
interface BuscarPacientePorCpfResponse {
  existe: boolean;
  paciente: PacienteCadastroParcial | null;
  camposFaltantes: CampoPacienteEssencial[];
  completo: boolean;  // true quando camposFaltantes está vazio
}

type CampoPacienteEssencial =
  | 'nome' | 'dataNascimento' | 'sexo' | 'telefone' | 'nomeMae'
  | 'endereco' | 'bairro' | 'municipio' | 'uf' | 'cep';
```

### Regras

- `cpf` na URL: aceita formatado ou só dígitos
- CPF com menos de 11 dígitos → retorna `{ existe: false, ..., completo: false }` (não 400)
- Paciente em outra UBS/prefeitura → retorna `{ existe: false, ... }` (scope-aware; não vaza existência)
- Paciente soft-deleted (`deletadoEm != null`) → retorna `{ existe: false, ... }`

### Response quando existe (exemplo)

```json
{
  "existe": true,
  "paciente": {
    "id": "uuid",
    "nome": "MARIA APARECIDA DA SILVA SANTOS",
    "nomeSocial": null,
    "cpf": "53474131826",
    "cpfFormatado": "534.741.318-26",
    "cartaoSus": null,
    "dataNascimento": "1968-03-14",
    "sexo": "F",
    "telefone": "(75) 99812-4421",
    "telefoneSecundario": null,
    "email": null,
    "nomeMae": null,
    "nomePai": null,
    "estadoCivil": "OUTRO",
    "escolaridade": null,
    "profissao": null,
    "racaCor": "NAO_INFORMADA",
    "endereco": "RUA DAS FLORES, 100",
    "bairro": null,
    "municipio": null,
    "uf": null,
    "cep": null,
    "grupoSanguineo": "NAO_INFORMADO",
    "ubsId": "ubs-central"
  },
  "camposFaltantes": ["nomeMae", "bairro", "municipio", "uf", "cep"],
  "completo": false
}
```

> `dataNascimento` vem `null` quando o paciente foi criado sem data (placeholder `1970-01-01` no banco). Nesses casos `dataNascimento` aparece em `camposFaltantes`.
>
> `sexo`, `estadoCivil` e `racaCor` só entram em `camposFaltantes` quando estão no valor "genérico" (`OUTRO` / `NAO_INFORMADA`).

### Response quando não existe

```json
{
  "existe": false,
  "paciente": null,
  "camposFaltantes": [
    "nome","dataNascimento","sexo","telefone","nomeMae",
    "endereco","bairro","municipio","uf","cep"
  ],
  "completo": false
}
```

### Como usar no form de consolidação

```ts
// 1. OCR do PDF
const ocr = await api.encaminhamentos.extrairPdf(file);

// 2. Busca pelo CPF extraído
const busca = await api.pacientes.porCpf(ocr.paciente.cpf);

// 3. Decide o que renderizar
if (busca.completo && busca.paciente) {
  // Paciente conhecido e com cadastro completo. Form complementar some.
  // Só mostra confirmação tipo "Encaminhamento para: MARIA APARECIDA (534.741.318-26)"
} else if (busca.existe && busca.paciente) {
  // Paciente existe mas está incompleto. Renderize APENAS os campos em busca.camposFaltantes
  // pré-preenchendo os que já vieram.
  renderFormComplementar({
    existente: busca.paciente,
    apenas: busca.camposFaltantes,
  });
} else {
  // Paciente novo. Render form completo com o que o OCR extraiu pré-preenchido.
  renderFormCompleto({ preench: ocr.paciente });
}
```

---

## 6. Cadastro incremental (preencher só se vazio)

O endpoint `POST /v1/encaminhamentos` agora aceita **13 campos complementares opcionais** dentro de `paciente`:

```ts
paciente: {
  // obrigatórios (sempre)
  nome, cpf, cartaoSus, dataNascimento, sexo, telefone, endereco,

  // complementares — todos opcionais, todos string?
  nomeSocial, telefoneSecundario, email,
  nomeMae, nomePai,
  estadoCivil,       // 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL' | 'OUTRO'
  escolaridade, profissao,
  racaCor,           // 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | 'NAO_INFORMADA'
  bairro, municipio, uf, cep,
}
```

### Regra de merge no backend

Dado o par `(valor_atual_no_banco, valor_novo_no_payload)`, o backend aplica:

| Atual no banco | Novo no payload | Ação |
|----------------|-----------------|------|
| `null` ou vazio | vem valor | **preenche** |
| tem valor | vem qualquer coisa | **ignora** (preserva edição) |
| `dataNascimento = 1970-01-01` (placeholder) | data real | **preenche** |
| `sexo = 'OUTRO'` | `'M'` ou `'F'` | **preenche** |
| `estadoCivil = 'OUTRO'` | valor específico | **preenche** |
| `racaCor = 'NAO_INFORMADA'` | valor específico | **preenche** |

**Nada que o atendente já preencheu é sobrescrito.** Um novo PDF com OCR "sujo" nunca corrompe dados cadastrais existentes.

### Exemplo de payload incremental

Paciente já existe com `endereco` e `telefone` preenchidos, faltam `bairro`, `municipio`, `uf`, `cep`, `nomeMae`:

```jsonc
// multipart/form-data → campo "payload" (JSON)
{
  "paciente": {
    "nome": "MARIA APARECIDA DA SILVA SANTOS",
    "cpf": "53474131826",
    "cartaoSus": "",
    "dataNascimento": "1968-03-14",
    "sexo": "F",
    "telefone": "(75) 99812-4421",   // ← ignorado (já existe no banco)
    "endereco": "RUA DAS FLORES, 100", // ← ignorado (já existe)

    // complementares — o backend grava só o que está vazio
    "nomeMae": "ANTONIA DA SILVA",
    "bairro": "CENTRO",
    "municipio": "ÁGUAS BELAS",
    "uf": "PE",
    "cep": "55325-000"
  },
  "solicitacao": { ... }
}
```

---

## 7. Edição direta do paciente (PATCH)

O endpoint `PATCH /v1/pacientes/:id` continua igual, mas ampliamos o role:

| Antes | Agora |
|-------|-------|
| `DESENVOLVEDOR`, `ADMIN`, `COORDENADOR_UBS` | + `ATENDENTE_UBS` (no escopo da própria UBS) |

Isso permite que o atendente edite o paciente **direto da tela de pacientes**, sem precisar criar um encaminhamento. 23 campos editáveis — ver [`docs/API.md §8`](./API.md) para a lista completa.

> Scope continua o mesmo: `ATENDENTE_UBS` só edita pacientes da sua UBS. Tentativa de editar paciente de outra UBS → `403 FORA_DO_ESCOPO`.

---

## 8. Fluxos ponta-a-ponta

### Fluxo A — Primeiro encaminhamento de um paciente NOVO

```
1. Atendente UBS sobe PDF de solicitação
     POST /v1/encaminhamentos/extrair-pdf (multipart)
     → { paciente, solicitacao, confiancaExtracao }

2. Frontend checa se paciente já existe
     GET /v1/pacientes/por-cpf/53474131826
     → { existe: false, paciente: null, camposFaltantes: [10 campos], completo: false }

3. Render form completo com OCR pré-preenchido.
   Atendente revisa/completa todos os campos essenciais.

4. Atendente clica "Consolidar"
     POST /v1/encaminhamentos (multipart)
     payload = {
       paciente: { ...todos os campos... },
       solicitacao: { ... }
     }

5. Backend (atômico):
     - cria Paciente com CPF só dígitos + todos os campos
     - cria Encaminhamento status AGUARDANDO_REGULACAO
     - cria PacienteConta (cpf, senhaHash = bcrypt(cpf), ativo=true, senhaProvisoria=true)
     - envia NotificacaoPaciente tipo ENCAMINHAMENTO_CRIADO
     - publica evento no outbox

6. Paciente já pode logar no app com CPF + CPF.
   App redireciona pra trocar senha antes de mostrar qualquer outra tela.
```

### Fluxo B — Segundo encaminhamento do mesmo paciente (ainda INCOMPLETO)

```
1. Atendente UBS sobe PDF
2. GET /v1/pacientes/por-cpf/53474131826
     → { existe: true, paciente: {...}, camposFaltantes: ['bairro','municipio','uf','cep'], completo: false }

3. Frontend renderiza:
     - HEADER read-only: dados que já existem (nome, data nasc, telefone, endereço, etc.)
     - FORM complementar: APENAS 4 campos (bairro, municipio, uf, cep)

4. Atendente preenche os 4 campos e consolida
     POST /v1/encaminhamentos
     payload.paciente = {
       ...dados obrigatórios (CPF, nome etc. — ignorados já que existem)...
       bairro: "CENTRO", municipio: "ÁGUAS BELAS", uf: "PE", cep: "55325-000"
     }

5. Backend:
     - atualiza Paciente com os 4 novos campos (preserva o resto)
     - cria o Encaminhamento novo
     - PacienteConta já existe → notificação vai direto (sem criar conta)
```

### Fluxo C — Terceiro encaminhamento (cadastro já COMPLETO)

```
1. Atendente sobe PDF
2. GET /v1/pacientes/por-cpf/53474131826
     → { existe: true, paciente: {...}, camposFaltantes: [], completo: true }

3. Frontend renderiza só um resumo:
     "Encaminhamento para MARIA APARECIDA DA SILVA SANTOS (534.741.318-26)"
   Sem form complementar. Apenas os campos da SOLICITAÇÃO MÉDICA.

4. Consolida → tudo reusa o cadastro do banco.
```

### Fluxo D — Paciente loga no app pela primeira vez

```
1. Paciente abre o app Flutter
2. Digita CPF (formatado ou só dígitos)
3. App sugere "primeiro acesso? Use seu CPF como senha"
4. POST /v1/paciente-app/auth/login
     { "cpf": "534.741.318-26", "senha": "53474131826" }
     → { token, paciente: { ..., senhaProvisoria: true } }

5. App detecta senhaProvisoria=true → tela de troca BLOQUEANTE
6. POST /v1/paciente-app/auth/trocar-senha
     Authorization: Bearer <token>
     { "senhaAtual": "53474131826", "novaSenha": "abcd1234" }
     → 204

7. App libera navegação. Próximos logins usam a senha nova.
   GET /v1/paciente-app/me retorna senhaProvisoria: false.
```

### Fluxo E — Edição direta (ADMIN ou ATENDENTE_UBS corrigindo dados)

```
1. Usuário abre /ubs/pacientes/[id] no frontend
2. GET /v1/pacientes/:id                      → PacienteCompleto
3. Edita campo "telefone" de "(75) 99812-4421" para "(75) 99000-0000"
4. PATCH /v1/pacientes/:id
     { "telefone": "(75) 99000-0000" }
   → 200 { id, nome }

   (Esse campo ESTAVA preenchido, então o PATCH sobrescreve —
    diferente do upsert do encaminhamento, que preserva.)
```

> Diferença central entre PATCH e upsert do encaminhamento:
> - **PATCH /pacientes/:id** → sobrescreve (edição explícita do usuário)
> - **POST /encaminhamentos (upsert paciente)** → preserva (efeito colateral; não deveria apagar dados)

---

## 9. Tipos TypeScript de referência

Copiáveis para o frontend (já exportados em `docs/types.ts`):

```ts
// Busca por CPF
export type CampoPacienteEssencial =
  | 'nome' | 'dataNascimento' | 'sexo' | 'telefone' | 'nomeMae'
  | 'endereco' | 'bairro' | 'municipio' | 'uf' | 'cep';

export interface PacienteCadastroParcial {
  id: string;
  nome: string;
  nomeSocial: string | null;
  cpf: string;           // dígitos
  cpfFormatado: string;
  cartaoSus: string | null;
  dataNascimento: string | null;  // YYYY-MM-DD ou null
  sexo: 'M' | 'F' | 'OUTRO';
  telefone: string | null;
  telefoneSecundario: string | null;
  email: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  estadoCivil: 'SOLTEIRO'|'CASADO'|'DIVORCIADO'|'VIUVO'|'UNIAO_ESTAVEL'|'OUTRO';
  escolaridade: string | null;
  profissao: string | null;
  racaCor: 'BRANCA'|'PRETA'|'PARDA'|'AMARELA'|'INDIGENA'|'NAO_INFORMADA';
  endereco: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  grupoSanguineo: string;
  ubsId: string;
}

export interface BuscarPacientePorCpfResponse {
  existe: boolean;
  paciente: PacienteCadastroParcial | null;
  camposFaltantes: CampoPacienteEssencial[];
  completo: boolean;
}

// Login paciente — agora com senhaProvisoria
export interface PacienteLoginResponse {
  token: string;
  expiresIn: number;
  paciente: {
    id: string;
    cpf: string;
    cpfFormatado: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    senhaProvisoria: boolean;   // ← NOVO
  };
}

// Troca de senha obrigatória
export interface TrocarSenhaPacienteRequest {
  senhaAtual: string;
  novaSenha: string;   // min 8 chars, diferente da atual
}

// /paciente-app/me
export interface PacienteMeResponse {
  id: string;
  nome: string;
  cpf: string;
  cpfFormatado: string;
  senhaProvisoria: boolean;  // ← NOVO
  email: string | null;       // ← NOVO
  telefone: string | null;    // ← NOVO
}
```

### API client (`docs/api-client.ts`)

Novos métodos:

```ts
api.pacientes.porCpf(cpf: string): Promise<BuscarPacientePorCpfResponse>
api.pacienteApp.trocarSenha(req: TrocarSenhaPacienteRequest): Promise<void>
```

---

## 10. Checklist de migração do frontend

### Face 1 (UBS)

- [ ] Tela de consolidar encaminhamento: chamar `api.pacientes.porCpf(cpf)` logo após o OCR
- [ ] Se `busca.completo === true` → esconder o form complementar inteiramente
- [ ] Se `busca.existe && !busca.completo` → renderizar **somente** os campos em `busca.camposFaltantes`, pré-preenchendo o que já existe em `busca.paciente`
- [ ] Validar que `solicitacao.especialidadeSolicitada` não é vazio antes do submit (backend rejeita com `400 PAYLOAD_INVALIDO`)
- [ ] Normalizar CPF antes de enviar se preciso (backend aceita qualquer formato; só dígitos evita ambiguidade em logs)
- [ ] Exibir lista de pacientes com CPF formatado, mas guardar dígitos internamente pra buscas

### Face 2 (SMS / Regulação)

- Sem mudanças. Contratos de `/gestao/regulacao/*` permanecem idênticos.

### Face 3 (App do Paciente Flutter)

- [ ] **Remover** tratamento de `403 CONTA_NAO_ATIVADA` no login
- [ ] **Remover** (ou esconder) fluxo de `/auth/ativar-conta` como fluxo padrão
- [ ] Adicionar checagem `if (login.paciente.senhaProvisoria)` → push na tela de troca de senha bloqueante
- [ ] Implementar tela de troca de senha chamando `api.pacienteApp.trocarSenha({ senhaAtual, novaSenha })`
- [ ] Mensagem inicial de login: orientar que **senha inicial = CPF**
- [ ] `GET /me` agora retorna `senhaProvisoria`, `email`, `telefone` — atualizar o parser

### Admin / DEV

- [ ] `ATENDENTE_UBS` agora aparece no PATCH de pacientes — liberar botão "Editar" na listagem de paciente pra esse role também

---

## Arquivos do backend afetados (referência rápida)

```
src/application/pacientes/BuscarPacientePorCpfUseCase.ts     [novo]
src/modules/paciente-app/application/use-cases/
    TrocarSenhaPacienteUseCase.ts                            [novo]
    LoginPacienteUseCase.ts                                  [alterado]

src/infrastructure/database/PrismaEncaminhamentoRepository.ts [alterado — preencher-se-vazio]
src/infrastructure/services/NotificacaoPacienteService.ts     [alterado — senha CPF]

src/presentation/controllers/PacienteController.ts            [+ getPorCpf]
src/modules/paciente-app/presentation/controllers/
    PacienteAppController.ts                                  [+ postTrocarSenha]
src/presentation/schemas/encaminhamentoSchemas.ts             [+ 13 campos complementares]
src/domain/repositories/IEncaminhamentoRepository.ts          [+ PacienteComplemento]
src/application/encaminhamentos/CreateEncaminhamentoUseCase.ts [repassa complemento]

src/presentation/middlewares/errorHandler.ts                  [log de Zod issues]
src/presentation/routes/index.ts                              [nova rota; ATENDENTE_UBS no PATCH]
src/modules/paciente-app/presentation/routes/
    paciente-app.routes.ts                                    [+ /auth/trocar-senha]
src/main/container.ts                                         [wiring]

prisma/schema.prisma                                          [+ PacienteConta.senhaProvisoria]
```
