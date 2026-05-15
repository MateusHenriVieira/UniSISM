# UNISISM · Backend — CHANGELOG da API

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Foco no que o **frontend** precisa saber. Infraestrutura interna só aparece se afetar contrato.

> 🔁 Arquivos do pacote de integração (`types.ts` + `api-client.ts` + `API.md`) são atualizados na mesma release.

---

## [0.10.0] — 2026-04-30 · Face 4 (TFD) v0.10 — REGULADOR_TFD + paciente inline

### 🎯 Destaque

Alinhamento completo do backend TFD com o frontend `v0.1.0` (rotas `/tfd/*`,
`tfd-types.ts`, `client.ts`, `erros-tfd.ts`). Documentação de referência em
[`TFD_API.md`](./TFD_API.md) (v0.10).

### Novo: role `REGULADOR_TFD`

UI minimalista (dashboard "minhas solicitações" + cadastro). Persona "balcão
presencial" — registra TFD para o cidadão que vai à SMS sem passar pela UBS.
Não aprova, não aloca, não vê frota/saldo/auditoria/relatórios. Escopo
PREFEITURA.

### `POST /v1/tfd/solicitacoes` — paciente inline

Aceita XOR `pacienteId` (existente) **ou** `paciente: DadosPacienteInline`
(upsert por CPF dentro da prefeitura — mescla campos ausentes). Campo
`acompanhante: DadosAcompanhante` obrigatório quando `acompanhanteNecessario=true`.

```diff
 interface SolicitacaoTFD {
   ...
+  acompanhante: DadosAcompanhante | null;
+  criadaPorId: string | null;
+  criadaPorNome: string | null;
   ...
 }
```

### Novo filtro: `GET /v1/tfd/solicitacoes?criadaPorMim=true`

Lista apenas registros com `criadaPorId === jwt.sub`. Default `false`. Usado
pelo dashboard simplificado do `REGULADOR_TFD`.

### Novo endpoint: `GET /v1/tfd/relatorios/especialidades`

Agregador para decisão "contratar especialista local vs. mandar fora".
Query: `?desde=YYYY-MM-DD&ate=YYYY-MM-DD&prefeituraId=` (default: últimos
12 meses). RBAC: gestor/admin/dev. Bloqueado para `REGULADOR_TFD` (`403
PERMISSAO_INSUFICIENTE`). Cache Redis TTL 1h. Detalhes em TFD_API.md §5.10.

### `POST /v1/admin/usuarios` — escalonamento controlado

- Aceita `role: 'REGULADOR_TFD'` e `role: 'GESTOR_TFD'`.
- **GESTOR_TFD pode criar apenas REGULADOR_TFD** — outras roles → `403 PERMISSAO_INSUFICIENTE`.
- ADMIN/DEV criam qualquer role respeitando hierarquia.

### RBAC corrigido: `pagar` ajuda de custo

- **Antes:** `POST /v1/tfd/ajudas-custo/:id/pagar` restrito a ADMIN/DEV.
- **Agora:** aceita `GESTOR_TFD` também (operação rotineira do gestor logístico).

### Códigos de erro novos

```
PACIENTE_OU_ID_OBRIGATORIO   400  POST /tfd/solicitacoes sem paciente nem pacienteId
PACIENTE_E_ID_CONFLITAM      400  POST /tfd/solicitacoes com os dois
ACOMPANHANTE_OBRIGATORIO     400  acompanhanteNecessario=true sem acompanhante
ROLE_INVALIDA_TFD            422  GESTOR_TFD criando role ≠ REGULADOR_TFD
JANELA_INVALIDA              400  desde > ate em /relatorios/especialidades
```

### Schema (Prisma)

```diff
 enum RoleAtendente {
   ...
   GESTOR_TFD
+  REGULADOR_TFD
 }

 model SolicitacaoTFD {
   ...
+  acompanhante  Json?     // DadosAcompanhante (v0.10)
+  criadaPorId   String?
+  criadaPorNome String?
 }
```

Sem migração destrutiva — campos novos são todos `Optional`.

---

## [0.9.1] — 2026-04-29 · Face 2 (SMS) modo simplificado

### 🎯 Destaque

Alinhamento backend × frontend para a UI enxuta do `REGULADOR_SMS`
(rotas `/sms/dashboard`, `/sms/solicitacoes`, `/sms/respostas`,
`/sms/encaminhamentos/:id`). Documentação dedicada em
[`SMS_SIMPLIFICADO.md`](./SMS_SIMPLIFICADO.md).

### Novo endpoint

- **`GET /v1/anexos/:id/download`** — top-level (paralelo aos já existentes
  `/tfd/anexos/:id/download` e `/paciente-app/anexos/:id/download`).
  Multi-tenancy via `encaminhamento.ubs.prefeituraId`. Retorna binário com:
  - `Content-Type` real do arquivo (PDF/JPEG/PNG, nunca `octet-stream`).
  - `Content-Disposition: inline; filename="..."` (preview em iframe).
  - `Cache-Control: private, max-age=0, must-revalidate`.
  - `X-Content-Type-Options: nosniff`.
  - `404 ANEXO_NAO_ENCONTRADO` (id inválido ou outra prefeitura).
  - `409 ANEXO_NAO_LIBERADO` quando `scanStatus ≠ LIMPO` (com `details.scanStatus`).

### Campos novos em `GET /v1/dashboard/metrics`

```diff
 interface MetricasDashboard {
   encaminhamentosHoje: number;
   aguardandoRegulacao: number;
   pendenciasDocumento: number;
   aprovadosHoje: number;
   tempoMedioConsolidacaoSegundos: number;
   encaminhamentosSemana: number;
+  enviadosAguardandoResposta: number;  // APROVADO sem respostaSUS
+  respondidosTotal: number;            // APROVADO com respostaSUS
 }
```

Permite o dashboard simplificado fazer **uma única** chamada (antes precisava
listar `?status=APROVADO&limit=1000` e bucketizar no cliente).

### Filtros novos em `GET /v1/encaminhamentos`

- `?respostaSUS=true|false` — filtra por presença da resposta oficial do SUS.

### Filtros novos em `GET /v1/encaminhamentos/arvore`

- `?respostaSUS=true|false` — alimenta o file-manager `/sms/respostas`.
- `?excluirRascunho=true` — alimenta o file-manager `/sms/solicitacoes`.

### Infra

- `IFileStorage.obterStream(caminho): Promise<NodeJS.ReadableStream>` —
  funciona em disco (`fs.createReadStream`) e em S3/MinIO
  (`GetObjectCommand.Body`). Necessário pra que o novo endpoint de download
  funcione com `STORAGE_PROVIDER=s3`.

### Compatibilidade

- 100% aditivo. Nenhum cliente existente quebra: campos novos no JSON,
  query params opcionais, endpoint novo em rota inédita.

---

## [0.6.0] — 2026-04-24 · CRUD administrativo completo

### 🎯 Destaques

ADMIN e DESENVOLVEDOR agora podem **editar e excluir** praticamente tudo no sistema, respeitando o escopo de cada um. Todas as operações auditadas.

### Novos endpoints

**Prefeituras** (`/admin/prefeituras/:id`):
- `PATCH` — DEV (qualquer) ou ADMIN (da própria) · campos: `nome`, `municipio`, `uf`, `cnpj`, `ativa`
- `DELETE` — **apenas DEV** · bloqueia se houver UBSs/usuários ativos (→ `409 PREFEITURA_COM_DEPENDENCIAS`)

**UBSs** (`/admin/ubs/:id`):
- `PATCH` — DEV/ADMIN no escopo · `nome`, `municipio`, `uf`, `endereco`, `cnes`, `ativa`
- `DELETE` — DEV/ADMIN · bloqueia se houver atendentes ativos ou encaminhamentos pendentes (→ `409 UBS_COM_DEPENDENCIAS`)

**Pacientes** (`/pacientes/:id`):
- `PATCH` — DEV (qualquer) · ADMIN (prefeitura) · COORDENADOR_UBS (sua UBS) · 23 campos editáveis
- `DELETE` — mesmas roles · bloqueia se houver encaminhamentos ativos (→ `409 PACIENTE_COM_ENCAMINHAMENTOS_ATIVOS`)
- NÃO altera CPF nem ubsId

**Encaminhamentos** (`/encaminhamentos/:id`):
- `PATCH` **ampliado**: ADMIN/DEV podem editar em qualquer status (correção administrativa) · gera evento `EDITADO` na timeline. ATENDENTE/COORDENADOR continuam restritos a `AGUARDANDO_REGULACAO`.
- `DELETE` (novo) — ADMIN/DEV · soft delete · exige `motivo` no body (≥ 10 caracteres) · gera evento `OBSERVACAO` preservando trilha

### Schema

`deletadoEm: DateTime?` adicionado em `Prefeitura`, `Ubs`, `Paciente` e `Encaminhamento`. Listagens filtram automaticamente via `scopeWhere` (zero mudança no contrato HTTP).

### Novos códigos de erro

- `PREFEITURA_COM_DEPENDENCIAS` (409) · com `details.ubsAtivas` e `details.atendentesAtivos`
- `UBS_COM_DEPENDENCIAS` (409) · com `details.atendentesAtivos` e `details.encsAtivos`
- `PACIENTE_COM_ENCAMINHAMENTOS_ATIVOS` (409) · com `details.encsAtivos`
- `PACIENTE_DUPLICADO` (409) · PATCH com CSUS já usado em outro paciente
- `MOTIVO_OBRIGATORIO` (400) · DELETE de enc sem motivo ≥ 10 chars

### Para o frontend

Novos métodos no cliente:

```ts
await api.admin.updatePrefeitura(id, { nome: '...', ativa: false });
await api.admin.deletePrefeitura(id);   // só DEV

await api.admin.updateUbs(id, { endereco: '...', cnes: '...' });
await api.admin.deleteUbs(id);

await api.pacientes.update(id, { profissao: '...', telefone: '...' });
await api.pacientes.delete(id);

await api.encaminhamentos.update(id, { prioridade: 'URGENTE' });  // ADMIN/DEV em qualquer status
await api.encaminhamentos.delete(id, { motivo: 'Duplicidade com outro protocolo' });
```

### Auditoria

8 novas ações registradas em `auditoria_logs` (retenção ilimitada):
`EDITAR_PREFEITURA`, `EXCLUIR_PREFEITURA`, `EDITAR_UBS`, `EXCLUIR_UBS`, `EDITAR_PACIENTE`, `EXCLUIR_PACIENTE`, `EDITAR_ENCAMINHAMENTO`, `EXCLUIR_ENCAMINHAMENTO`.

---

## [0.5.0] — 2026-04-24 · Módulo de Relatórios LGPD-first (completo)

### 🎯 O que mudou

O stub antigo (que gerava arquivo dummy) foi substituído pelo **módulo completo** conforme [`docs/RELATORIOS.md`](RELATORIOS.md) — **zero mudança no contrato HTTP**, mas implementação 100% reescrita.

Os 3 endpoints (`GET /relatorios`, `POST /relatorios`, `GET /relatorios/:id/download`) mantêm o mesmo shape — o frontend **não precisa mudar nada**. Tudo que mudou é interno.

### Adicionado

- **Pipeline assíncrono em 3 camadas** (API → Worker → Download)
- **Dados reais** por tipo (7 tipos documentados em §5):
  - `FILA_REGULACAO` (operacional sem PII)
  - `ENCAMINHAMENTOS_POR_ESPECIALIDADE` (agregado, zero PII)
  - `PENDENCIAS_RESOLVIDAS`
  - `TFD_CUSTOS`
  - `VACINACAO_UBS`
  - `BUSCA_ATIVA` (com modo nominal opt-in + justificativa obrigatória)
  - `PRODUCAO_INDIVIDUAL`
- **3 renderers** funcionais:
  - **CSV** com BOM UTF-8, header LGPD comentado (`#`), streaming via fast-csv
  - **XLSX** via exceljs WorkbookWriter com 2 abas (Dados + Metadados)
  - **PDF** via pdfkit com cabeçalho, rodapé, marca d'água "CONFIDENCIAL" em tipos sensíveis
- **SHA-256 de cada arquivo** (não-repúdio — campo `hashSha256` em `relatorio_job`)
- **Audit log imutável** (`relatorio_audit`) com 5 ações: CRIADO, DOWNLOAD, FALHA, EXPIRADO, EXCLUIDO
- **Rate limit** via Redis (10/h/usuário · 30/d · 3 simultâneas/prefeitura)
- **Cron diário de expiração** (TTL 7 dias — apaga arquivo do storage, marca EXPIRADO)
- **Guards LGPD**:
  - Só o dono, ADMIN da mesma prefeitura ou DESENVOLVEDOR acessam download
  - Recurso fora do escopo → `404` (não `403`, pra não vazar existência)
  - `RELATORIO_EXPIRADO` → HTTP 410
- **Minimização LGPD**: cada tipo tem **lista explícita de colunas** no código (`TipoRelatorioMeta`). Zero `SELECT *`.
- **Mascaramento de PII** em `dataSources`: CPF, cartão SUS e telefone só saem mascarados em modo nominal.

### Schema mudou (Prisma)

- `Relatorio` (`relatorio_job`) ganhou: `prefeituraId`, `ubsId`, `storageKey`, `contentType`, `tamanhoBytes`, `hashSha256`, `finalizadoEm`, `downloads`, `ultimoDownload`, `erroTraceId`.
- Nova tabela `RelatorioAudit` (`relatorio_audit`) com enum `AcaoAuditRelatorio`.
- Relações adicionadas em `Prefeitura` e `Ubs`.

### Novos códigos de erro

- `TIPO_RELATORIO_INVALIDO` (400)
- `PERIODO_INVALIDO` (400) — fora de ordem, futura ou > 12 meses
- `FORMATO_INVALIDO` (400)
- `NOMINAL_NAO_PERMITIDO` (422) — tipo não suporta nominal
- `JUSTIFICATIVA_OBRIGATORIA` (422) — nominal sem justificativa de ≥30 chars
- `PREFEITURA_OBRIGATORIA` (422) — DEV gerando sem `filtros.prefeituraId`
- `RATE_LIMIT_EXCEDIDO` (429)
- `RELATORIO_NAO_DISPONIVEL` (409)
- `RELATORIO_EXPIRADO` (410)
- `ARQUIVO_NAO_ENCONTRADO` (404) — job DISPONIVEL mas arquivo sumiu do storage

### Para o frontend

**Nada muda**. O shape `Relatorio` já estava correto. O frontend continua:
1. Chamar `POST /relatorios` (recebe `status: PROCESSANDO`)
2. Fazer polling em `GET /relatorios` a cada 2s
3. Quando `status: DISPONIVEL` → `GET /relatorios/:id/download`

A diferença é que agora você recebe **dados reais** do banco, em arquivos **completos com cabeçalho LGPD e hash**, com tratamento de erros rico (410 expirado, 429 rate, 409 fora de ordem).

### Validado em runtime

- ✅ CSV gerado (708 bytes, header LGPD completo, BOM UTF-8)
- ✅ XLSX gerado (7707 bytes, formato válido Microsoft Excel 2007+)
- ✅ PDF gerado (4 páginas, 4235 bytes, `application/pdf`)
- ✅ Hash SHA-256 gravado em todos
- ✅ Downloads incrementando + audit log populado (3 downloads = 4 linhas de audit)
- ✅ Isolamento: ATENDENTE de outra UBS → `404 RELATORIO_NAO_ENCONTRADO`
- ✅ Rate limit disparando em 429 após estourar janela

### Arquivos novos

```
src/modules/relatorios/
├── domain/
│   └── TipoRelatorioMeta.ts          (single source of truth · LGPD)
├── application/
│   ├── CriarRelatorioUseCase.ts      (validação + RBAC + rate limit + audit)
│   ├── ListarRelatoriosUseCase.ts
│   ├── BaixarRelatorioUseCase.ts     (guard LGPD + audit + incremento)
│   ├── RelatorioWorker.ts            (coordenador de render + storage + hash)
│   ├── ExpiracaoCron.ts              (TTL 7d · apaga storage)
│   └── dataSources.ts                (queries com minimização de colunas)
├── infrastructure/
│   ├── RateLimiter.ts                (Redis + fallback in-memory)
│   ├── RelatorioAuditLogger.ts       (retenção 5 anos)
│   └── renderers/
│       ├── types.ts                  (interface Renderer)
│       ├── CsvRenderer.ts
│       ├── XlsxRenderer.ts
│       └── PdfRenderer.ts
└── presentation/
    └── RelatoriosController.ts       (3 endpoints)
```

### Removido

- `src/application/relatorios/` (antigo stub)
- `src/infrastructure/database/PrismaRelatorioRepository.ts`
- `src/domain/repositories/IRelatorioRepository.ts`
- `src/presentation/controllers/RelatorioController.ts`

---

## [0.4.0] — 2026-04-23 · Compressão de PDF + CRUD completo + App do Paciente (Face 3)

### 🎯 Destaques

- **PDF compression**: Ghostscript (com fallback pdf-lib). No teste real, **200 KB → 1 KB (0.5% do original)**.
- **CRUD completo de usuários** via `/admin/usuarios/:id` (PATCH, DELETE, ativo, reset-senha).
- **Edição de encaminhamentos** via `PATCH /encaminhamentos/:id` (apenas em `AGUARDANDO_REGULACAO`, gera evento `EDITADO`).
- **Face 3 — App do Paciente** com auth por CPF + timeline de trânsito (estilo Amazon/Shopee).
- **Notificações automáticas** ao paciente em toda transição: criado → pendência → aprovado → agendado → rejeitado → resposta SUS.

### Adicionado · endpoints

**Admin (CRUD extendido):**
- `PATCH /admin/usuarios/:id` — edita nome, email, telefone, cargo, função, vínculo UBS/prefeitura
- `DELETE /admin/usuarios/:id` — soft delete (revoga sessões e marca `deletadoEm`)
- `POST /admin/usuarios/:id/ativo` — `{ ativo: boolean }` ativa/desativa
- `POST /admin/usuarios/:id/reset-senha` — admin redefine (usuário deve trocar no próximo login)

**Encaminhamentos:**
- `PATCH /encaminhamentos/:id` — edita dados do paciente/solicitação (gate: `AGUARDANDO_REGULACAO`)

**App do Paciente (`/paciente-app/*`):**
- `POST /auth/login` — CPF + senha
- `POST /auth/ativar-conta` — CPF + data de nascimento + senha inicial
- `POST /auth/logout` — revoga sessão
- `GET  /me` — dados da conta
- `GET  /meus-encaminhamentos` — lista pelo CPF
- `GET  /notificacoes` · `?apenasNaoLidas=true` — timeline do paciente
- `GET  /notificacoes/count` — badge de não-lidas
- `POST /notificacoes/:id/lida`
- `POST /notificacoes/marcar-todas-lidas`
- `GET  /anexos/:id/download` — download com auth do paciente (só se `scanStatus=LIMPO` + anexo do próprio CPF)

### Adicionado · schema DTO

- `AnexoDocumento.scanStatus` (já existia desde 0.3.0, mencionado aqui pois agora é ativamente preenchido no fluxo resposta-sus)
- Enum `TipoEventoTimeline` ganhou `EDITADO`
- Enum `TipoNotificacaoPaciente`: 7 tipos correspondentes às transições
- Novos shapes: `NotificacaoPacienteDTO`, `PacienteLoginResponse`, `ContadorNotificacoes`, etc.

### Adicionado · códigos de erro

- `AUTO_EXCLUSAO_PROIBIDA`, `AUTO_DESATIVACAO_PROIBIDA` — admin tentando excluir/desativar a própria conta
- `EDICAO_NAO_PERMITIDA` — PATCH encaminhamento fora de AGUARDANDO_REGULACAO
- `NENHUMA_ALTERACAO`, `JUSTIFICATIVA_VAZIA` — validações do PATCH
- `CONTA_NAO_ATIVADA`, `CONTA_JA_ATIVADA`, `CONTA_NAO_ENCONTRADA`, `CONTA_INATIVA` — app paciente
- `CONFIRMACAO_INVALIDA` — ativar-conta com data de nascimento errada
- `ANEXO_NAO_ENCONTRADO`, `ANEXO_NAO_LIBERADO` — download paciente
- `NOTIFICACAO_NAO_ENCONTRADA`

### Compressão de PDF

Todo PDF (solicitação médica + resposta SUS) é automaticamente comprimido ao salvar:

- **1º preferência**: Ghostscript com preset `/screen` (dpi 72, compressão massiva)
- **Fallback**: `pdf-lib` re-save com metadata stripping
- Escolhe sempre o menor resultado entre original, gs e pdf-lib — nunca devolve maior que o original.
- Economia real observada em dev: **99.5%** em PDFs nativos com padding; em PDFs reais escaneados, espera-se 60-80%.

Nada muda no contrato HTTP — só economia de disco/S3. O frontend recebe o `tamanhoKb` pós-compressão em `AnexoDocumento`.

### Notificações do paciente (Face 3)

Toda transição de encaminhamento gera **automaticamente** uma linha na timeline do paciente:

| Evento backend | Notificação pro app |
|---|---|
| `POST /encaminhamentos` (UBS consolida) | `ENCAMINHAMENTO_CRIADO` — "📩 Encaminhamento solicitado" |
| `POST /:id/registrar-pendencia` | `PENDENCIA_REGISTRADA` — "⚠️ Documentação pendente" |
| `POST /:id/resolve-pendencia` (UBS responde) | `PENDENCIA_RESOLVIDA` — "🔁 Documentação complementada" |
| `POST /:id/aprovar` | `APROVADO` — "✅ Encaminhamento aprovado" |
| `POST /:id/aprovar` com `agendamentoPrevisto` | + `AGENDADO` — "📅 Atendimento agendado para {data}" |
| `POST /:id/rejeitar` | `REJEITADO` — "❌ Encaminhamento não aprovado" + motivo |
| `POST /:id/resposta-sus` | `RESPOSTA_SUS_DISPONIVEL` — "📎 Resposta do SUS disponível" |

Se o paciente ainda não tiver conta criada no app, uma conta **pendente** é criada automaticamente (ativo=false, senhaHash='!pending!'). Quando o paciente ativar via `/paciente-app/auth/ativar-conta`, todas as notificações retroativas ficam disponíveis.

### Seed atualizado

Conta do app para teste:
```
CPF:   123.456.789-00  (MARIA APARECIDA)
Senha: 12345678
```
Com encaminhamentos já criados pra testar a timeline.

### Migração (o que fazer no frontend)

1. Recopiar `docs/types.ts` e `docs/api-client.ts`.
2. Usar `api.admin.updateUsuario(id, ...)`, `api.admin.deleteUsuario(id)`, etc.
3. Usar `api.encaminhamentos.update(id, ...)` para editar.
4. Para o app do paciente (novo projeto/rota): `api.pacienteApp.login(...)`, `api.pacienteApp.notificacoes()` etc. Usa token separado e não conflita com a Face 1/2.

---

## [0.3.0] — 2026-04-23 · Stack de produção + scanStatus nos anexos

### Adicionado · contrato HTTP

- **`AnexoDocumento.scanStatus`** — novo campo obrigatório em toda resposta que inclui anexos (`Encaminhamento`, detalhes, lista). Enum: `PENDENTE | LIMPO | INFECTADO | FALHOU`.
  - Antes o download de anexo era assumido sempre seguro. Agora o frontend deve olhar o status e **bloquear download quando ≠ LIMPO**.
  - Em dev local (sem ClamAV), vira `LIMPO` em ~1s. Em produção, pode levar segundos/minutos durante o scan.

### Adicionado · infra (transparente pro frontend)

- **Cache Redis** no `GET /encaminhamentos/arvore` (TTL 60s). Invalidação automática nas transições de encaminhamento. Sem Redis funciona igual — só mais lento.
- **Audit log persistente** de `LOGIN_SUCESSO`, `LOGIN_FALHA`, `CRIAR_USUARIO`, transições de status. CPF/Cartão SUS mascarados.
- **Métricas Prometheus** em `GET /metrics` (sem `/v1`, sem auth). **Uso interno** — frontend não consome.
- **Outbox pattern** — eventos de domínio (`encaminhamento.aprovado` etc.) ficam em `outbox_events` e são publicados pelo worker. Hoje só loga; em produção plugará em webhook/fila.
- **Storage S3-compatible** — toggle via `STORAGE_PROVIDER=s3`. Dev usa MinIO local (console em `:9001`).
- **ClamAV opcional** — ativa com `CLAMAV_HOST=...`. Todo upload passa por scan antes de liberar download.

### Migração (o que fazer no frontend)

1. Copiar novamente `docs/types.ts` → `frontend/src/lib/api/types.ts` (ganhou `StatusScanAnexo` e o campo `scanStatus` em `AnexoDocumento`).
2. Onde desenha a lista de anexos (tab "Anexos" no detalhe do encaminhamento), ler `scanStatus`:
   ```svelte
   {#if anexo.scanStatus === 'PENDENTE'}
     <button disabled title="Analisando segurança…">Aguardando</button>
   {:else if anexo.scanStatus === 'LIMPO'}
     <button on:click={() => baixar(anexo.id)}>Baixar</button>
   {:else if anexo.scanStatus === 'INFECTADO'}
     <span class="text-red-600">⚠️ Bloqueado — arquivo recusado por segurança</span>
   {:else}
     <span class="text-amber-600">Scan falhou — peça ao admin</span>
   {/if}
   ```
3. Nenhum endpoint foi removido ou renomeado. Nada mais quebra.

---

## [0.2.0] — 2026-04-22 · Face 2 completa (Regulação SMS)

### Adicionado · novos endpoints

- `POST /encaminhamentos/:id/aprovar` — transição `AGUARDANDO_REGULACAO` → `APROVADO` (nota + agendamento opcionais)
- `POST /encaminhamentos/:id/registrar-pendencia` — transição → `PENDENCIA_DOCUMENTO` (observação obrigatória)
- `POST /encaminhamentos/:id/rejeitar` — transição → `REJEITADO` (motivo obrigatório, terminal)
- `POST /encaminhamentos/:id/resposta-sus` — enrichment pós-APROVADO, anexa PDF oficial do SUS Federal
- `GET  /encaminhamentos/arvore` — agregação hierárquica (UBS → Ano → Mês → Dia) pro file-manager da SMS

### Adicionado · schema do DTO

- `Encaminhamento.respostaSUS?: { anexoId, observacao, registradoEm, registradoPor }` — preenchido só após `POST /:id/resposta-sus`
- `TipoAnexo` ganhou `RESPOSTA_SUS`
- `TipoEventoTimeline` ganhou `RESPOSTA_SUS_RECEBIDA`

### Adicionado · novos códigos de erro

- `ENCAMINHAMENTO_NAO_AGUARDANDO_REGULACAO` (409)
- `OBSERVACAO_OBRIGATORIA` (422)
- `MOTIVO_OBRIGATORIO` (422)
- `AGENDAMENTO_INVALIDO` / `AGENDAMENTO_NO_PASSADO` (422)
- `ENCAMINHAMENTO_NAO_APROVADO` (409)
- `RESPOSTA_SUS_JA_REGISTRADA` (409)
- `PDF_RESPOSTA_OBRIGATORIO` (422)
- `PARAMS_INCOMPATIVEIS` (400)
- `UBS_NAO_ENCONTRADA` (404)

### Mudanças do seed

- Novo usuário: `SMS-099101` / senha `12345678` · role `REGULADOR_SMS` · escopo Prefeitura Feira de Santana

---

## [0.1.0] — 2026-04-22 · MVP Face 1 (UBS) + Admin

### Entregue

- **Auth completo**: login (matrícula OU email), logout, forgot→verify→reset, me, troca de senha autenticada, encerrar outras sessões
- **Perfil do atendente** com produção, segurança e atividade recente
- **Dashboard**: `GET /dashboard/metrics` com escopo automático
- **Encaminhamentos Face 1**: extract-pdf (OCR), create, list, byId, resolve-pendencia
- **Pacientes (PEC)**: list e byId completos (alergias, crônicas, medicamentos, atendimentos, TFD, exames, vacinas, médicos)
- **Relatórios**: list, create (assíncrono), download
- **Admin**: criar/listar prefeituras, UBSs e usuários com RBAC por escopo
- **Isolamento total entre prefeituras**: 404 (não 403) para recursos fora do escopo
- **5 roles**: `DESENVOLVEDOR | ADMIN | COORDENADOR_UBS | ATENDENTE_UBS | REGULADOR_SMS`

### Seed inicial

- `DEV-001` · DESENVOLVEDOR · acesso global
- `ADM-001` · ADMIN · Prefeitura Feira de Santana
- `SMS-047291` · ATENDENTE_UBS · UBS CENTRAL
- 1 paciente (MARIA APARECIDA) + 1 encaminhamento em PENDENCIA_DOCUMENTO (`UBS-2026-100137`)

Todas as senhas: `12345678`.
