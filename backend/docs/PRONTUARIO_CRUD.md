# UNISISM · Prontuário do Paciente — CRUD de sub-documentos

> O frontend UBS agora permite **cadastro completo** de todas as entidades
> que compõem o prontuário do paciente: alergias, condições crônicas,
> medicamentos, histórico familiar, atendimentos, exames, vacinação e
> viagens TFD.
>
> Este documento especifica os **19 endpoints REST** que o backend precisa
> expor (v0.7.0+) para atender ao frontend já pronto. Todos os endpoints
> estão consumidos em `src/lib/api/client.ts` e os tipos correspondentes
> em `src/lib/api/types.ts`.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Convenções](#2-convenções)
3. [Schema do banco](#3-schema-do-banco)
4. [Quadro clínico](#4-quadro-clínico)
5. [Atendimentos](#5-atendimentos)
6. [Exames](#6-exames)
7. [Vacinação](#7-vacinação)
8. [Viagens TFD](#8-viagens-tfd)
9. [Matriz RBAC](#9-matriz-rbac)
10. [Auditoria](#10-auditoria)
11. [Checklist de entrega](#11-checklist-de-entrega)

---

## 1. Visão geral

Todas as entidades do prontuário são **sub-documentos de `Paciente`** — nascem
com um `id` UUID atribuído pelo backend e vivem sob `/pacientes/:pacienteId/...`.

**Retorno padrão de TODOS os endpoints:**

```ts
Promise<PacienteCompleto>
```

O backend sempre retorna o `PacienteCompleto` atualizado após criar/editar/deletar.
Isso elimina refetch do frontend e garante consistência do estado.

**Exceção:** `DELETE` que devolve 204 No Content é aceitável, mas requer que
o frontend chame `byId` depois. **Preferimos retornar 200 + PacienteCompleto.**

---

## 2. Convenções

### 2.1 URLs

Todas aninhadas sob o paciente:

```
POST    /v1/pacientes/:pacienteId/<recurso>
PATCH   /v1/pacientes/:pacienteId/<recurso>/:id
DELETE  /v1/pacientes/:pacienteId/<recurso>/:id
```

Para histórico familiar (lista de strings, não entidade com ID):

```
PUT     /v1/pacientes/:pacienteId/historico-familiar
```

### 2.2 Isolation

Toda rota já tem `pacienteId` no path. O backend DEVE:

1. Resolver `paciente` por `pacienteId`
2. Verificar que `paciente.ubsId` está dentro do escopo do JWT do usuário:
   - `ATENDENTE_UBS` / `COORDENADOR_UBS`: só a própria UBS
   - `ADMIN`: toda a prefeitura
   - `REGULADOR_SMS`: **leitura apenas** (não pode criar/editar/deletar prontuário)
   - `DESENVOLVEDOR`: tudo

3. Se o paciente não for acessível → `404 PACIENTE_NAO_ENCONTRADO` (nunca 403; evita vazamento de existência).

### 2.3 Identidade dos sub-documentos

**Novidade v0.7.0+:** `Alergia`, `CondicaoCronica` e `MedicamentoEmUso`
precisam ter **`id: string`** (UUID) gerado pelo backend no momento da
criação, exatamente como `Atendimento`, `ExameRealizado`, etc. já têm.

O frontend usa esse `id` como chave no `{#each}` e no DELETE/PATCH.

### 2.4 Error codes esperados

| Código                            | HTTP | Contexto                              |
| --------------------------------- | ---- | ------------------------------------- |
| `PACIENTE_NAO_ENCONTRADO`         | 404  | scope miss ou id inválido             |
| `ITEM_NAO_ENCONTRADO`             | 404  | sub-documento inexistente             |
| `PERMISSAO_INSUFICIENTE`          | 403  | REGULADOR_SMS tentando escrever       |
| `PAYLOAD_INVALIDO`                | 400  | validação Zod/class-validator falhou  |
| `CID_INVALIDO`                    | 422  | CID-10 em formato inválido            |
| `DATA_INVALIDA`                   | 422  | data no passado inválido, etc.        |
| `NENHUMA_ALTERACAO`               | 400  | PATCH sem mudança                     |
| `HISTORICO_FAMILIAR_MUITO_LONGO`  | 422  | lista com > 50 itens                  |
| `ITEM_DUPLICADO`                  | 409  | tentar criar alergia idêntica         |

---

## 3. Schema do banco

Sugestão em Postgres — entidades filhas do paciente com FK cascata lógica
(mas **soft delete** preferido em tudo com `deletadoEm timestamptz NULL`):

```sql
-- Alergias
CREATE TABLE paciente_alergia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  substancia      text NOT NULL,
  tipo            text NOT NULL,           -- MEDICAMENTO|ALIMENTO|AMBIENTAL|OUTRO
  gravidade       text NOT NULL,           -- LEVE|MODERADA|GRAVE
  observacao      text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  criado_por      uuid NOT NULL REFERENCES usuario(id),
  deletado_em     timestamptz,
  UNIQUE (paciente_id, substancia) WHERE deletado_em IS NULL
);

-- Condições crônicas
CREATE TABLE paciente_condicao_cronica (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  cid10           text NOT NULL,
  descricao       text NOT NULL,
  desde           date NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  observacao      text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  criado_por      uuid NOT NULL REFERENCES usuario(id),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  deletado_em     timestamptz,
  UNIQUE (paciente_id, cid10) WHERE deletado_em IS NULL
);

-- Medicamentos em uso
CREATE TABLE paciente_medicamento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  nome            text NOT NULL,
  dosagem         text NOT NULL,
  frequencia      text NOT NULL,
  desde           date NOT NULL,
  prescritor      text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  criado_por      uuid NOT NULL REFERENCES usuario(id),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  deletado_em     timestamptz
);

-- Histórico familiar (lista de strings)
CREATE TABLE paciente_historico_familiar (
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  ordem           int NOT NULL,           -- posição da string
  texto           text NOT NULL,
  PRIMARY KEY (paciente_id, ordem)
);

-- Atendimentos
CREATE TABLE paciente_atendimento (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id            uuid NOT NULL REFERENCES paciente(id),
  data                   timestamptz NOT NULL,
  tipo                   text NOT NULL,
  profissional           text NOT NULL,
  registro_profissional  text NOT NULL,
  especialidade          text,
  unidade                text NOT NULL,
  queixa_principal       text NOT NULL,
  diagnostico            text,
  cid10                  text,
  conduta                text NOT NULL,
  prescricao_resumo      text,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  criado_por             uuid NOT NULL REFERENCES usuario(id),
  deletado_em            timestamptz
);

-- Exames
CREATE TABLE paciente_exame (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         uuid NOT NULL REFERENCES paciente(id),
  data                date NOT NULL,
  tipo                text NOT NULL,
  categoria           text NOT NULL,      -- LABORATORIAL|IMAGEM|FUNCIONAL|OUTROS
  solicitante         text NOT NULL,
  unidade_executora   text,
  resultado           text NOT NULL,      -- NORMAL|ALTERADO|CRITICO|PENDENTE
  observacao          text,
  laudo_storage_key   text,                -- upload futuro
  criado_em           timestamptz NOT NULL DEFAULT now(),
  criado_por          uuid NOT NULL REFERENCES usuario(id),
  deletado_em         timestamptz
);

-- Vacinação
CREATE TABLE paciente_vacina (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES paciente(id),
  data        date NOT NULL,
  vacina      text NOT NULL,
  dose        text NOT NULL,
  lote        text NOT NULL,
  aplicador   text NOT NULL,
  unidade     text NOT NULL,
  via         text NOT NULL,               -- INTRAMUSCULAR|SUBCUTANEA|ORAL|INTRADERMICA
  criado_em   timestamptz NOT NULL DEFAULT now(),
  criado_por  uuid NOT NULL REFERENCES usuario(id),
  deletado_em timestamptz,
  UNIQUE (paciente_id, vacina, dose, lote) WHERE deletado_em IS NULL
);

-- Viagens TFD
CREATE TABLE paciente_viagem_tfd (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          uuid NOT NULL REFERENCES paciente(id),
  protocolo            text NOT NULL,
  data_ida             date NOT NULL,
  data_volta           date NOT NULL,
  destino              text NOT NULL,
  unidade_destino      text,
  motivo               text NOT NULL,
  especialidade        text NOT NULL,
  acompanhante         boolean NOT NULL DEFAULT false,
  transporte           text NOT NULL,
  status               text NOT NULL DEFAULT 'AGENDADA',
  custo_estimado_brl   numeric(12,2) NOT NULL DEFAULT 0,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  criado_por           uuid NOT NULL REFERENCES usuario(id),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  deletado_em          timestamptz,
  UNIQUE (protocolo) WHERE deletado_em IS NULL
);
```

---

## 4. Quadro clínico

### 4.1 Alergias (2 endpoints)

#### `POST /pacientes/:pacienteId/alergias`

```ts
// Request body
{
  substancia: string;
  tipo: 'MEDICAMENTO' | 'ALIMENTO' | 'AMBIENTAL' | 'OUTRO';
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  observacao?: string;
}
// Response 201 → PacienteCompleto
```

Erros: `409 ITEM_DUPLICADO` se já existe alergia com mesma `substancia` ativa.

#### `DELETE /pacientes/:pacienteId/alergias/:alergiaId`

Response 200 → PacienteCompleto.
Soft delete (`deletado_em = now()`). Motivo: alergias são críticas — preservar histórico.

---

### 4.2 Condições crônicas (3 endpoints)

#### `POST /pacientes/:pacienteId/condicoes-cronicas`

```ts
{
  cid10: string;            // validar contra lista de CIDs válidos
  descricao: string;
  desde: string;            // YYYY-MM-DD
  ativo?: boolean;          // default true
  observacao?: string;
}
// Response 201 → PacienteCompleto
```

Erros: `409 ITEM_DUPLICADO` se já existe condição ativa com mesmo `cid10`.

#### `PATCH /pacientes/:pacienteId/condicoes-cronicas/:condicaoId`

```ts
{
  descricao?: string;
  ativo?: boolean;          // toggle "encerrar" / "reativar"
  observacao?: string | null;
}
// Response 200 → PacienteCompleto
```

**Importante:** `cid10` e `desde` NÃO podem ser alterados. Se precisar trocar
o CID, deletar e criar novo.

#### `DELETE /pacientes/:pacienteId/condicoes-cronicas/:condicaoId`

Soft delete. Preferir `PATCH ativo=false` pra preservar histórico.

---

### 4.3 Medicamentos (3 endpoints)

#### `POST /pacientes/:pacienteId/medicamentos`

```ts
{
  nome: string;
  dosagem: string;
  frequencia: string;       // "1 comp de 12/12h"
  desde: string;
  prescritor: string;       // "Dr. João · CRM/BA 12345"
  ativo?: boolean;          // default true
}
// Response 201 → PacienteCompleto
```

#### `PATCH /pacientes/:pacienteId/medicamentos/:medicamentoId`

```ts
{
  dosagem?: string;
  frequencia?: string;
  prescritor?: string;
  ativo?: boolean;          // suspender/reativar
}
// Response 200 → PacienteCompleto
```

#### `DELETE /pacientes/:pacienteId/medicamentos/:medicamentoId`

Soft delete.

---

### 4.4 Histórico familiar (1 endpoint)

#### `PUT /pacientes/:pacienteId/historico-familiar`

**Substituição total** — o frontend envia a lista completa e o backend apaga
tudo e regrava na ordem fornecida. Tipo replace-all, não merge.

```ts
{
  itens: string[];           // ex.: ["Pai — Diabetes tipo 2", "Mãe — Hipertensão"]
}
// Response 200 → PacienteCompleto
```

Validação: máximo 50 itens, cada um ≤ 200 chars.

Implementação sugerida:
```sql
BEGIN;
DELETE FROM paciente_historico_familiar WHERE paciente_id = :id;
INSERT INTO paciente_historico_familiar (paciente_id, ordem, texto)
VALUES ...;
COMMIT;
```

---

## 5. Atendimentos (2 endpoints)

### `POST /pacientes/:pacienteId/atendimentos`

```ts
{
  data: string;                // ISO 8601 completo
  tipo: 'CONSULTA_MEDICA' | 'ENFERMAGEM' | 'VACINACAO' | 'CURATIVO'
      | 'ODONTOLOGICO' | 'PROCEDIMENTO' | 'ACOLHIMENTO';
  profissional: string;
  registroProfissional: string;
  especialidade: string;
  unidade: string;
  queixaPrincipal: string;     // SUBJETIVO (SOAP)
  diagnostico: string;
  cid10: string;
  conduta: string;             // PLANO (SOAP)
  prescricaoResumo?: string;
}
// Response 201 → PacienteCompleto
```

Validações:
- `data` ≤ now() (não pode ser futuro)
- `queixaPrincipal` e `conduta` obrigatórios (mín 3 chars)
- `cid10` opcional no backend mas recomendado

### `DELETE /pacientes/:pacienteId/atendimentos/:atendimentoId`

Soft delete. Só operadores da mesma UBS que criaram OU `ADMIN+` podem remover.

---

## 6. Exames (2 endpoints)

### `POST /pacientes/:pacienteId/exames`

```ts
{
  data: string;                // YYYY-MM-DD
  tipo: string;                // "Hemograma completo"
  categoria: 'LABORATORIAL' | 'IMAGEM' | 'FUNCIONAL' | 'OUTROS';
  solicitante: string;
  unidadeExecutora: string;
  resultado: 'NORMAL' | 'ALTERADO' | 'CRITICO' | 'PENDENTE';
  observacao?: string;
}
// Response 201 → PacienteCompleto
```

### `DELETE /pacientes/:pacienteId/exames/:exameId`

Soft delete.

> **Futuro:** endpoint separado para upload de PDF de laudo, tipo
> `POST /pacientes/:pacienteId/exames/:exameId/laudo` (multipart).

---

## 7. Vacinação (2 endpoints)

### `POST /pacientes/:pacienteId/vacinacoes`

```ts
{
  data: string;                // YYYY-MM-DD
  vacina: string;              // "Pfizer COVID-19"
  dose: string;                // "1ª Dose" | "Reforço" | etc.
  lote: string;
  aplicador: string;
  unidade: string;
  via: 'INTRAMUSCULAR' | 'SUBCUTANEA' | 'ORAL' | 'INTRADERMICA';
}
// Response 201 → PacienteCompleto
```

Unique constraint: `(paciente_id, vacina, dose, lote)` — impede duplicata do mesmo registro.

### `DELETE /pacientes/:pacienteId/vacinacoes/:vacinaId`

Soft delete. **Apenas `COORDENADOR_UBS+`** — caderneta é documento oficial.

---

## 8. Viagens TFD (3 endpoints)

### `POST /pacientes/:pacienteId/viagens`

```ts
{
  protocolo: string;           // único por prefeitura; validar com 409 ITEM_DUPLICADO
  dataIda: string;             // YYYY-MM-DD
  dataVolta: string;           // YYYY-MM-DD, >= dataIda
  destino: string;
  unidadeDestino: string;
  motivo: string;
  especialidade: string;
  acompanhante: boolean;
  transporte: 'VAN_SMS' | 'AMBULANCIA' | 'PASSAGEM_RODOVIARIA' | 'PASSAGEM_AEREA';
  status?: 'AGENDADA' | 'EM_ANDAMENTO' | 'REALIZADA' | 'CANCELADA';  // default AGENDADA
  custoEstimadoBRL: number;    // >= 0
}
// Response 201 → PacienteCompleto
```

### `PATCH /pacientes/:pacienteId/viagens/:viagemId`

Todos os campos acima opcionais, exceto `protocolo` (imutável).

**Transições de status permitidas:**
- AGENDADA → EM_ANDAMENTO
- AGENDADA → CANCELADA
- EM_ANDAMENTO → REALIZADA
- EM_ANDAMENTO → CANCELADA
- REALIZADA → (terminal, não muda mais)
- CANCELADA → AGENDADA (permitir reagendar)

Transição inválida → `422 TRANSICAO_INVALIDA`.

### `DELETE /pacientes/:pacienteId/viagens/:viagemId`

Soft delete. **Apenas `ADMIN+`** — viagem afeta orçamento municipal.

---

## 9. Matriz RBAC

| Recurso              | ATENDENTE_UBS | COORD_UBS | REGULADOR_SMS | ADMIN | DEV |
| -------------------- | :-----------: | :-------: | :-----------: | :---: | :-: |
| **Alergias**         |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌ (403)       | ✅     | ✅   |
| DELETE               | ✅             | ✅         | ❌             | ✅     | ✅   |
| **Condições**        |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌             | ✅     | ✅   |
| PATCH                | ✅             | ✅         | ❌             | ✅     | ✅   |
| DELETE               | ❌             | ✅         | ❌             | ✅     | ✅   |
| **Medicamentos**     |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌             | ✅     | ✅   |
| PATCH (ativo/dose)   | ✅             | ✅         | ❌             | ✅     | ✅   |
| DELETE               | ❌             | ✅         | ❌             | ✅     | ✅   |
| **Histórico**        |               |           |               |       |     |
| PUT                  | ✅             | ✅         | ❌             | ✅     | ✅   |
| **Atendimentos**     |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌             | ✅     | ✅   |
| DELETE               | ❌             | ✅         | ❌             | ✅     | ✅   |
| **Exames**           |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌             | ✅     | ✅   |
| DELETE               | ❌             | ✅         | ❌             | ✅     | ✅   |
| **Vacinação**        |               |           |               |       |     |
| POST                 | ✅             | ✅         | ❌             | ✅     | ✅   |
| DELETE               | ❌             | ✅         | ❌             | ✅     | ✅   |
| **Viagens TFD**      |               |           |               |       |     |
| POST                 | ❌             | ✅         | ✅             | ✅     | ✅   |
| PATCH (status/dados) | ❌             | ✅         | ✅             | ✅     | ✅   |
| DELETE               | ❌             | ❌         | ❌             | ✅     | ✅   |

**Regra geral:**
- Atendente pode criar (é a linha de frente), mas só coord+ pode deletar → preserva rastreabilidade
- Regulador SMS NÃO toca prontuário primário (só TFD, que é competência da SMS)
- Admin pode fazer tudo dentro da própria prefeitura
- DEV faz tudo

---

## 10. Auditoria

Toda operação de escrita gera uma linha em `paciente_prontuario_audit`:

```sql
CREATE TABLE paciente_prontuario_audit (
  id              bigserial PRIMARY KEY,
  operador_id     uuid NOT NULL REFERENCES usuario(id),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  recurso         text NOT NULL,    -- ALERGIA | CONDICAO | MEDICAMENTO | HISTORICO_FAMILIAR
                                     -- | ATENDIMENTO | EXAME | VACINA | VIAGEM_TFD
  recurso_id      uuid,              -- nullable pra histórico familiar
  acao            text NOT NULL,    -- CREATE | UPDATE | DELETE
  antes           jsonb,              -- snapshot pré (null em CREATE)
  depois          jsonb,              -- snapshot pós (null em DELETE)
  ip              inet,
  user_agent      text,
  em              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_paciente_audit_pac ON paciente_prontuario_audit (paciente_id, em DESC);
CREATE INDEX idx_paciente_audit_op ON paciente_prontuario_audit (operador_id, em DESC);
```

**Retenção: 20 anos** (prontuário eletrônico — Res. CFM 1.821/2007 exige arquivamento mínimo de 20 anos).

---

## 11. Checklist de entrega

### Schema
- [ ] 8 tabelas novas + índices (ver §3)
- [ ] Migration do campo `id UUID` em alergia/condicao/medicamento (se já existiam como JSONB)
- [ ] Tabela `paciente_prontuario_audit` com retenção configurada
- [ ] Constraints de unique (substancia, cid10, protocolo TFD, lote+vacina+dose)

### Endpoints (19 rotas)
- [ ] `POST/DELETE /pacientes/:id/alergias[/:alergiaId]` · 2 rotas
- [ ] `POST/PATCH/DELETE /pacientes/:id/condicoes-cronicas[/:condicaoId]` · 3 rotas
- [ ] `POST/PATCH/DELETE /pacientes/:id/medicamentos[/:medicamentoId]` · 3 rotas
- [ ] `PUT /pacientes/:id/historico-familiar` · 1 rota
- [ ] `POST/DELETE /pacientes/:id/atendimentos[/:atendimentoId]` · 2 rotas
- [ ] `POST/DELETE /pacientes/:id/exames[/:exameId]` · 2 rotas
- [ ] `POST/DELETE /pacientes/:id/vacinacoes[/:vacinaId]` · 2 rotas
- [ ] `POST/PATCH/DELETE /pacientes/:id/viagens[/:viagemId]` · 3 rotas (+ toggle de status)
- [ ] **Todos retornam `PacienteCompleto` completo** em 200/201

### Validação (Zod/class-validator)
- [ ] Schemas para cada DTO listado acima (§4-§8)
- [ ] CID-10: regex `^[A-Z][0-9]{2}(\.[0-9A-Z]+)?$`
- [ ] Datas: ISO 8601 válidas, não futuras onde aplicável
- [ ] Protocolo TFD: único por prefeitura (409)

### RBAC
- [ ] Middleware por rota conforme matriz §9
- [ ] Isolation: `paciente.ubs.prefeitura_id = jwt.prefeituraId` (exceto DEV)
- [ ] ATENDENTE_UBS só a UBS própria
- [ ] REGULADOR_SMS bloqueado em tudo exceto TFD

### Auditoria
- [ ] Trigger genérico que grava `antes`/`depois` em jsonb
- [ ] IP e user-agent capturados do request
- [ ] Retenção 20 anos configurada

### Testes integrados
- [ ] ATENDENTE de UBS A tenta criar atendimento em paciente de UBS B → 404
- [ ] REGULADOR_SMS tenta registrar vacina → 403
- [ ] Criar alergia duplicada (mesma substância) → 409
- [ ] DELETE de medicamento por ATENDENTE → 403 (só coord+)
- [ ] PATCH viagem com transição inválida (REALIZADA → AGENDADA) → 422
- [ ] PUT historico-familiar com 51 itens → 422

---

## 12. O que já está pronto no frontend

### Client TS (`src/lib/api/client.ts` · classe `PacientesApi`)

```ts
// Alergias
api.pacientes.addAlergia(pacienteId, req)                   → PacienteCompleto
api.pacientes.removeAlergia(pacienteId, alergiaId)          → PacienteCompleto

// Condições
api.pacientes.addCondicaoCronica(pacienteId, req)           → PacienteCompleto
api.pacientes.updateCondicaoCronica(pacienteId, id, req)    → PacienteCompleto
api.pacientes.removeCondicaoCronica(pacienteId, id)         → PacienteCompleto

// Medicamentos
api.pacientes.addMedicamento(pacienteId, req)               → PacienteCompleto
api.pacientes.updateMedicamento(pacienteId, id, req)        → PacienteCompleto
api.pacientes.removeMedicamento(pacienteId, id)             → PacienteCompleto

// Histórico familiar
api.pacientes.setHistoricoFamiliar(pacienteId, itens)       → PacienteCompleto

// Atendimentos
api.pacientes.addAtendimento(pacienteId, req)               → PacienteCompleto
api.pacientes.removeAtendimento(pacienteId, id)             → PacienteCompleto

// Exames
api.pacientes.addExame(pacienteId, req)                     → PacienteCompleto
api.pacientes.removeExame(pacienteId, id)                   → PacienteCompleto

// Vacinação
api.pacientes.addVacina(pacienteId, req)                    → PacienteCompleto
api.pacientes.removeVacina(pacienteId, id)                  → PacienteCompleto

// Viagens TFD
api.pacientes.addViagemTfd(pacienteId, req)                 → PacienteCompleto
api.pacientes.updateViagemTfd(pacienteId, id, req)          → PacienteCompleto
api.pacientes.removeViagemTfd(pacienteId, id)               → PacienteCompleto
```

### Tipos (`src/lib/api/types.ts`)

Todos em uma seção dedicada:

```ts
CriarAlergiaRequest
CriarCondicaoCronicaRequest  ·  AtualizarCondicaoCronicaRequest
CriarMedicamentoRequest      ·  AtualizarMedicamentoRequest
AtualizarHistoricoFamiliarRequest
CriarAtendimentoRequest
CriarExameRequest
CriarVacinaRequest
CriarViagemTfdRequest        ·  AtualizarViagemTfdRequest
```

### Componentes UI (`src/lib/presentation/components/prontuario/`)

- `RegistrarAlergia.svelte`
- `RegistrarCondicaoCronica.svelte`
- `RegistrarMedicamento.svelte`
- `RegistrarAtendimento.svelte` (modal XL com SOAP)
- `RegistrarExame.svelte`
- `RegistrarVacina.svelte`
- `RegistrarViagemTfd.svelte`
- `ConfirmarRemocao.svelte` (modal de confirmação genérico)

### Páginas integradas (`src/routes/ubs/pacientes/[id]/`)

- `quadro-clinico/+page.svelte` — CRUD completo de alergias / condições / medicamentos / histórico familiar
- `atendimentos/+page.svelte` — botão "+ Atendimento" + remover por linha
- `exames/+page.svelte` — "+ Exame" + remover por linha
- `vacinas/+page.svelte` — "+ Dose Aplicada" + remover por linha
- `viagens/+page.svelte` — "+ Viagem TFD" + toggle de status + cancelar/remover

**Quando o backend subir as 19 rotas, nada muda no frontend — só liga.**

---

*Última atualização: 2026-04-24 · Frontend versão: pós-v0.7.0.*
