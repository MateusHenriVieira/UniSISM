# UNISISM · Face 2 · SMS — Modo Simplificado (REGULADOR_SMS)

> Companion técnico do contrato de frontend para o modo **simplificado** da
> Face 2, destinado ao usuário `REGULADOR_SMS` que **não é**
> `ADMIN`/`DESENVOLVEDOR`.
>
> Este doc descreve **exatamente o que o backend devolve** para os 4
> endpoints consumidos pela UI enxuta (`/sms/dashboard`, `/sms/solicitacoes`,
> `/sms/respostas`, `/sms/encaminhamentos/:id`) — request, response,
> headers, regras e erros.
>
> **Versão:** v0.9.1 · **Última atualização:** 2026-04-29
> **Frontend de referência:** `v0.1.0` (rotas `/sms/*` e
> `AnexoActions.svelte`).

---

## Índice

1. [Persona e contexto](#1-persona-e-contexto)
2. [RBAC efetivo](#2-rbac-efetivo)
3. [Multi-tenancy](#3-multi-tenancy)
4. [`GET /v1/dashboard/metrics`](#4-get-v1dashboardmetrics)
5. [`GET /v1/encaminhamentos`](#5-get-v1encaminhamentos)
6. [`GET /v1/encaminhamentos/:id`](#6-get-v1encaminhamentosid)
7. [`GET /v1/encaminhamentos/arvore`](#7-get-v1encaminhamentosarvore)
8. [`GET /v1/anexos/:id/download`](#8-get-v1anexosiddownload)
9. [Códigos de erro](#9-códigos-de-erro)
10. [Como testar (curl ponta-a-ponta)](#10-como-testar)
11. [O que mudou na v0.9.1](#11-o-que-mudou-na-v091)

---

## 1. Persona e contexto

O **REGULADOR_SMS** é o servidor da Secretaria que recebe os encaminhamentos
das UBSs, lê documentação clínica e — quando o SUS Federal responde — repassa
ao paciente. Ele **não regula clinicamente** e **não administra** rede / usuários.

Precisa apenas de 4 visualizações:

| Tela do frontend                          | Endpoint(s) consumido(s)                                      |
|-------------------------------------------|---------------------------------------------------------------|
| `/sms/dashboard` (4 cards)                | `GET /v1/dashboard/metrics`                                   |
| `/sms/solicitacoes` (file-manager)        | `GET /v1/encaminhamentos/arvore` ou `?excluirRascunho=true`   |
| `/sms/respostas` (file-manager)           | `GET /v1/encaminhamentos/arvore?respostaSUS=true`             |
| `/sms/encaminhamentos/:id` (3 abas)       | `GET /v1/encaminhamentos/:id` + `GET /v1/anexos/:id/download` |

A UI completa (5 abas, botões de aprovar/negar/etc.) e os endpoints
correspondentes (`POST /encaminhamentos/:id/aprovar`, etc.) **continuam
existindo** — só não são chamados no modo simples. Ver `API.md` §11.

---

## 2. RBAC efetivo

Decidido em runtime pelo `requireRole(...)` em `src/presentation/routes/index.ts`:

| Endpoint                                     | REGULADOR_SMS | ADMIN | DEV  | Outros          |
|----------------------------------------------|:-------------:|:-----:|:----:|-----------------|
| `GET /dashboard/metrics`                     | ✅            | ✅    | ✅   | ATENDENTE/COORD ✅ |
| `GET /encaminhamentos`                       | ✅            | ✅    | ✅   | ATENDENTE/COORD ✅ |
| `GET /encaminhamentos/:id`                   | ✅            | ✅    | ✅   | ATENDENTE/COORD ✅ |
| `GET /encaminhamentos/arvore`                | ✅            | ✅    | ✅   | ❌ (`PERMISSAO_INSUFICIENTE`) |
| `GET /anexos/:id/download`                   | ✅            | ✅    | ✅   | ATENDENTE/COORD ✅ |
| `POST /encaminhamentos/:id/aprovar`          | ✅            | ❌    | ✅   | ❌              |
| `POST /encaminhamentos/:id/rejeitar`         | ✅            | ❌    | ✅   | ❌              |
| `POST /encaminhamentos/:id/registrar-pendencia` | ✅         | ❌    | ✅   | ❌              |
| `POST /encaminhamentos/:id/resposta-sus`     | ✅            | ❌    | ✅   | ❌              |

> **Importante:** o "modo simples" da UI **omite** os botões de decisão,
> mas **não** retira o RBAC do REGULADOR_SMS para esses endpoints. Se o
> frontend chamar `POST /aprovar` enquanto exibindo o modo simples, o
> backend aceita normalmente (a restrição é UI). Para um lockdown server-side
> de "apenas leitura" para REGULADOR_SMS, criar uma role distinta —
> hoje não existe.

---

## 3. Multi-tenancy

Aplicado em **todas** as rotas listadas acima:

- **`REGULADOR_SMS`** tem `prefeituraId` no JWT — o backend filtra encaminhamentos
  via `encaminhamento.ubs.prefeituraId === jwt.prefeituraId` (`whereByScopeViaUbs`).
- Recurso de **outra prefeitura** → **`404`** (jamais `403`, pra não revelar
  existência). Aplicável tanto a encaminhamentos quanto a anexos.
- **`DESENVOLVEDOR`** (`GLOBAL`) ignora o filtro e pode passar
  `?prefeituraId=...` na query para forçar escopo.

Cabeçalhos comuns em toda resposta:

```
X-Request-Id: <uuid>            # tracing
Content-Type: application/json; charset=utf-8
```

---

## 4. `GET /v1/dashboard/metrics`

Retorna os contadores que alimentam os 4 cards do dashboard simples + os já
consumidos pela UI completa.

**Auth:** Bearer JWT.
**Filtro:** automático pela `prefeituraId` do JWT.

**Response 200:**

```json
{
  "encaminhamentosHoje": 12,
  "aguardandoRegulacao": 47,
  "pendenciasDocumento": 3,
  "aprovadosHoje": 8,
  "tempoMedioConsolidacaoSegundos": 342,
  "encaminhamentosSemana": 91,
  "enviadosAguardandoResposta": 28,
  "respondidosTotal": 156
}
```

| Campo | Como o card simples mapeia | Definição |
|---|---|---|
| `encaminhamentosHoje`        | **Chegaram Hoje**     | `criadoEm >= 00:00 hoje` (timezone do servidor) |
| `aguardandoRegulacao`        | **Pendentes**         | `status = AGUARDANDO_REGULACAO` |
| `enviadosAguardandoResposta` | **Enviados**          | `status = APROVADO AND respostaSusAnexoId IS NULL` |
| `respondidosTotal`           | **Respondidos**       | `status = APROVADO AND respostaSusAnexoId IS NOT NULL` |

> Os 2 últimos campos **foram adicionados na v0.9.1** especificamente pra
> esta tela — antes o frontend tinha que listar `?status=APROVADO&limit=1000`
> e bucketizar no cliente.

**Erros:** `401 NAO_AUTENTICADO` / `TOKEN_EXPIRADO`.

---

## 5. `GET /v1/encaminhamentos`

Listagem padrão. Suporta filtros por status, paciente, data e — desde
v0.9.1 — `respostaSUS`.

**Query params:**

| Param          | Tipo                                         | Descrição                              |
|----------------|----------------------------------------------|----------------------------------------|
| `status`       | enum `StatusEncaminhamento`                  | `RASCUNHO` / `AGUARDANDO_REGULACAO` / `PENDENCIA_DOCUMENTO` / `APROVADO` / `REJEITADO` |
| `pacienteId`   | string                                       | UUID do paciente                       |
| `desde` / `ate`| string ISO-8601 (`YYYY-MM-DD` ou full)       | Janela em `criadoEm`                   |
| `limit`        | number 1..500 (default 100)                  | Paginação flat                         |
| `respostaSUS`  | `true \| false`                              | **v0.9.1** — filtra por presença de resposta SUS |

**Response 200:** `Encaminhamento[]` (ver `domain/entities/Encaminhamento.ts`).

**Exemplos:**

```
# explorador /sms/respostas (só com resposta SUS)
GET /v1/encaminhamentos?respostaSUS=true&limit=500

# bucket "Enviados" do dashboard simples
GET /v1/encaminhamentos?status=APROVADO&respostaSUS=false

# todos os do dia 29/04 da prefeitura corrente
GET /v1/encaminhamentos?desde=2026-04-29&ate=2026-04-29&limit=500
```

**Erros:** `400 PAYLOAD_INVALIDO` (query inválida), `401 NAO_AUTENTICADO`.

---

## 6. `GET /v1/encaminhamentos/:id`

Detalhe completo. **Mesmo endpoint** alimenta a UI completa (5 abas) e a
simplificada (3 abas) — o frontend escolhe qual subset mostrar.

**Response 200:** `Encaminhamento` com:

```ts
{
  id: string;
  protocolo: string;
  status: StatusEncaminhamento;
  paciente: Paciente;            // aba "Paciente"
  solicitacao: SolicitacaoMedica; // aba "Solicitação Clínica"
  anexos: AnexoDocumento[];       // aba "Anexos"
  timeline: EventoTimeline[];     // (escondida no modo simples)
  observacoesRegulacao?: string;  // (escondida no modo simples)
  agendamentoPrevisto?: string;   // (escondida no modo simples)
  respostaSUS?: {
    anexoId: string;
    observacao: string;
    registradoEm: string;          // ISO-8601
    registradoPor: { id, nome, matricula };
  } | null;
  criadoEm: string;
  atualizadoEm: string;
  unidadeOrigem: string;
  atendenteResponsavel: string;
}
```

**Erros:**
- `404 ENCAMINHAMENTO_NAO_ENCONTRADO` — id inválido **ou** outra prefeitura.
- `401 NAO_AUTENTICADO`.

---

## 7. `GET /v1/encaminhamentos/arvore`

Endpoint agregado que alimenta o file-manager (UBS → Ano → Mês → Dia)
sem trazer os encaminhamentos individuais.

**Query params:**

| Param            | Tipo            | v0.9.1 | Descrição                                          |
|------------------|-----------------|:------:|----------------------------------------------------|
| `ubsId`          | string          |        | Desce um nível                                     |
| `ano`            | number 1900-9999|        | Exige `ubsId`                                      |
| `mes`            | number 1-12     |        | Exige `ubsId` + `ano`                              |
| `respostaSUS`    | `true \| false` | ✓      | Filtra contagens por presença de resposta SUS      |
| `excluirRascunho`| `true \| false` | ✓      | Quando `true`, exclui `status=RASCUNHO` do total   |

**Quando enviar o quê (telas frontend):**

```
# /sms/solicitacoes — todas as solicitações que efetivamente chegaram
GET /v1/encaminhamentos/arvore?excluirRascunho=true

# /sms/respostas — apenas casos com resposta SUS
GET /v1/encaminhamentos/arvore?respostaSUS=true
```

**Response 200:** `ArvoreUbsNode[] | ArvoreAnoNode[] | ArvoreMesNode[] | ArvoreDiaNode[]` conforme o nível. Shape canônico:

```json
[
  {
    "ubsId": "uuid",
    "nome": "PSF Dona Lindu",
    "totalEncaminhamentos": 1,
    "anoMaisRecente": 2026,
    "statusContagem": { "aguardando": 1, "pendencia": 0, "aprovado": 0, "rejeitado": 0 }
  }
]
```

**Cache:** Redis com TTL definido em `CACHE_TTL.ARVORE`. A chave inclui
`respostaSUS` e `excluirRascunho` — variantes não vazam entre si.

**Erros:**
- `400 PARAMS_INCOMPATIVEIS` (`mes` sem `ano`, `ano` sem `ubsId`).
- `404 UBS_NAO_ENCONTRADA` (id inválido ou fora da prefeitura).
- `403 PERMISSAO_INSUFICIENTE` (escopo `UBS` tentando usar a árvore).

---

## 8. `GET /v1/anexos/:id/download`

Endpoint top-level criado na **v0.9.1** especificamente para a UI da Face 2.
Existe paralelo a `/v1/tfd/anexos/:id/download` (Face 4) e
`/v1/paciente-app/anexos/:id/download` (Face 3).

**Auth:** Bearer JWT (qualquer role autenticada que pertença à prefeitura).

**Comportamento:**

| Caso                                                | Status | Code                         |
|-----------------------------------------------------|:------:|------------------------------|
| Sem token                                           | 401    | `TOKEN_AUSENTE` / `TOKEN_EXPIRADO` |
| Anexo não existe                                    | 404    | `ANEXO_NAO_ENCONTRADO`       |
| Anexo de outra prefeitura                           | 404    | `ANEXO_NAO_ENCONTRADO`       |
| `scanStatus = PENDENTE \| INFECTADO \| FALHOU`      | 409    | `ANEXO_NAO_LIBERADO` (com `details.scanStatus`) |
| OK                                                  | 200    | binário                       |

**Headers da resposta 200:**

```http
Content-Type: application/pdf            # ou image/jpeg, image/png — o que estiver gravado em anexo.mimeType
Content-Disposition: inline; filename="laudo-paciente.pdf"
Cache-Control: private, max-age=0, must-revalidate
X-Content-Type-Options: nosniff
```

`inline` é deliberado — permite que o frontend exiba o PDF dentro de um
`<iframe>` (modal de visualização). Para forçar download na "nova aba", o
`AnexoActions.svelte` cria um `<a download>` no cliente; não depende de
`attachment`.

**Streaming:**

- Em **disco** (`STORAGE_PROVIDER=disk`): `fs.createReadStream` direto.
- Em **S3/MinIO** (`STORAGE_PROVIDER=s3`): `S3Client.send(GetObjectCommand)`
  → `Body` (stream Node) → `pipe(res)`.

Implementação em `IFileStorage.obterStream(caminho)` (added na v0.9.1) —
tanto `DiskFileStorage` quanto `S3FileStorage` implementam.

**Limite de tamanho:** 10 MB por anexo (definido no upload em
`POST /v1/encaminhamentos`). Não há novo limite no download.

**Filename sanitizado:** o backend troca `\r\n"\\` por `_` antes de montar o
header — evita CRLF injection em `Content-Disposition`.

---

## 9. Códigos de erro

Subset relevante para os 4 endpoints (catálogo completo: `API.md` §14).

| Code                          | HTTP | Quando                                                      |
|-------------------------------|:----:|--------------------------------------------------------------|
| `TOKEN_AUSENTE`               | 401  | Sem header `Authorization`.                                 |
| `TOKEN_EXPIRADO`              | 401  | JWT fora da validade.                                       |
| `NAO_AUTENTICADO`             | 401  | Token inválido / assinatura quebrada.                       |
| `PERMISSAO_INSUFICIENTE`      | 403  | Role autenticada não pode chamar este endpoint (ex.: árvore por UBS). |
| `ENCAMINHAMENTO_NAO_ENCONTRADO`| 404 | ID inválido ou outra prefeitura.                            |
| `ANEXO_NAO_ENCONTRADO`        | 404  | Idem para anexos.                                           |
| `UBS_NAO_ENCONTRADA`          | 404  | `ubsId` inválido na árvore.                                 |
| `PARAMS_INCOMPATIVEIS`        | 400  | Query da árvore com combinação inválida.                    |
| `PAYLOAD_INVALIDO`            | 400  | Schema Zod rejeita query/body.                              |
| `ANEXO_NAO_LIBERADO`          | 409  | Scan ≠ `LIMPO`. `details.scanStatus`.                       |
| `ERRO_INTERNO`                | 500  | Genérico.                                                   |

Formato canônico:

```json
{ "error": { "code": "...", "message": "...", "details": { } } }
```

---

## 10. Como testar

```bash
# 1. login como REGULADOR_SMS (usuário do seed)
TOKEN=$(curl -s http://localhost:3333/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"MTS-001","senha":"<senha>"}' | jq -r .token)

# (se a senha não estiver mais conhecida — resetar via DEV:
#  POST /v1/admin/usuarios/:id/reset-senha — gera nova senha provisória)

# 2. dashboard simplificado (4 cards)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/v1/dashboard/metrics \
  | jq '{enviadosAguardandoResposta, respondidosTotal, encaminhamentosHoje, aguardandoRegulacao}'

# 3. file-manager /sms/solicitacoes (UBSs com contagens)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/v1/encaminhamentos/arvore?excluirRascunho=true" | jq

# 4. file-manager /sms/respostas (apenas com resposta SUS)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/v1/encaminhamentos/arvore?respostaSUS=true" | jq

# 5. abrir encaminhamento (3 abas)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/v1/encaminhamentos/<id> | jq '{paciente, solicitacao, anexos, respostaSUS}'

# 6. baixar anexo (preview iframe)
curl -s -o anexo.pdf -D headers.txt \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/v1/anexos/<anexoId>/download
grep -E '^(Content-Type|Content-Disposition|Cache-Control|X-Content-Type-Options):' headers.txt

# 7. anexo de outra prefeitura → 404
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/v1/anexos/<idForaDaSuaPrefeitura>/download
# 404
```

---

## 11. O que mudou na v0.9.1

Mudanças desta versão (em `API.md` mantém-se compatível — apenas adições):

| # | Mudança                                          | Onde tocou                                                               |
|---|--------------------------------------------------|--------------------------------------------------------------------------|
| 1 | **Novo endpoint** `GET /v1/anexos/:id/download`  | `src/application/anexos/GetDownloadAnexoUseCase.ts`, `src/presentation/controllers/AnexosController.ts`, `src/presentation/routes/index.ts` |
| 2 | `IFileStorage.obterStream(caminho)`              | `src/domain/services/IFileStorage.ts` + ambas as implementações          |
| 3 | `MetricasDashboard.enviadosAguardandoResposta`   | `src/domain/entities/Encaminhamento.ts`, `src/infrastructure/database/PrismaEncaminhamentoRepository.ts` |
| 4 | `MetricasDashboard.respondidosTotal`             | idem                                                                     |
| 5 | `?respostaSUS=true\|false` em `/encaminhamentos` | `listarQuerySchema`, `ListEncaminhamentosUseCase`, `PrismaEncaminhamentoRepository.listar()` |
| 6 | `?respostaSUS=` e `?excluirRascunho=` em `/encaminhamentos/arvore` | `RegulacaoController.getArvore`, `GetArvoreEncaminhamentosUseCase.exec` (raw SQL com `Prisma.sql`) |

**Compatibilidade:** todos os clientes existentes continuam funcionando —
campos novos no JSON são aditivos, query params são opcionais.

---

## 12. Referências

- `docs/API.md` §11 — contrato detalhado dos POSTs de decisão (aprovar/rejeitar/etc.).
- Frontend spec **UNISISM · Face 2 · SMS — Variante Simplificada** — base deste alinhamento.
- `src/modules/gestao/` — código da Face 2.
- `src/presentation/routes/index.ts` — rota `/anexos/:id/download` (linha "Anexos · download genérico").
