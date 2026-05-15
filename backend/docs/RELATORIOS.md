# UNISISM · Módulo de Relatórios — Guia de Implementação Backend (LGPD-first)

> **Premissa arquitetural:** o frontend é um consumidor burro. Toda a lógica de consulta,
> filtragem, agregação e renderização acontece no backend. O frontend nunca vê linha
> individual de paciente — só metadados do relatório e o blob final já renderizado.
> Isso é o que te protege contra vazamento e garante aderência à LGPD (Lei 13.709/2018).

---

## 1. Contrato atual do frontend (FIXO — não mudar)

O frontend já está 100% pronto e consome apenas **3 endpoints**. Qualquer implementação
backend precisa honrar exatamente essa interface.

### 1.1 Endpoints

| Método | Rota                            | Propósito                              |
| ------ | ------------------------------- | -------------------------------------- |
| `GET`  | `/relatorios`                   | Lista metadados dos últimos 90 dias    |
| `POST` | `/relatorios`                   | Enfileira geração de novo relatório    |
| `GET`  | `/relatorios/:id/download`      | Stream do binário (blob autenticado)   |

### 1.2 Tipos (fonte de verdade: `backend/docs/types.ts`)

```ts
export type TipoRelatorio =
  | 'PRODUCAO_INDIVIDUAL'
  | 'ENCAMINHAMENTOS_POR_ESPECIALIDADE'
  | 'FILA_REGULACAO'
  | 'PENDENCIAS_RESOLVIDAS'
  | 'TFD_CUSTOS'
  | 'VACINACAO_UBS'
  | 'BUSCA_ATIVA';

export type FormatoRelatorio = 'PDF' | 'CSV' | 'XLSX';
export type StatusRelatorio = 'DISPONIVEL' | 'PROCESSANDO' | 'FALHA';

export interface Relatorio {
  id: string;
  titulo: string;           // "Fila de Regulação · Abr/2026" — backend decide
  tipo: TipoRelatorio;
  periodo: string;          // "01/04/2026 – 22/04/2026" já formatado
  formato: FormatoRelatorio;
  geradoEm: string;         // ISO 8601
  tamanhoKb: number;
  status: StatusRelatorio;
}

export interface CriarRelatorioRequest {
  tipo: TipoRelatorio;
  dataInicial: string;      // YYYY-MM-DD
  dataFinal: string;
  formato: FormatoRelatorio;
  filtros?: Record<string, unknown>;  // reservado pra expansão futura
}
```

### 1.3 Comportamento esperado (ciclo de vida)

```
┌────────────────────────────────────────────────────────────────┐
│ Tela /sms/relatorios (frontend)                                 │
│                                                                 │
│ 1. Lista cards de tipos (7 cards cosméticos · hardcoded na UI) │
│ 2. Usuário escolhe: tipo + dataInicial + dataFinal + formato   │
│ 3. POST /relatorios → recebe Relatorio{status: 'PROCESSANDO'}  │
│ 4. Polling GET /relatorios a cada 2s (máx 30 tentativas)       │
│ 5. Quando status = 'DISPONIVEL' → botão "Baixar" habilita      │
│ 6. Click "Baixar" → GET /relatorios/:id/download                │
│ 7. Browser salva blob com filename do Content-Disposition      │
└────────────────────────────────────────────────────────────────┘
```

O frontend **não interpreta** o conteúdo do blob. Ele só baixa e deixa o SO abrir.

---

## 2. Pipeline de geração (3 camadas)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. ENDPOINT HTTP — POST /relatorios                              │
│                                                                   │
│  • Auth guard: extrai { userId, role, escopo, prefeituraId,      │
│    ubsId } do JWT                                                 │
│  • Valida:                                                        │
│      - tipo existe em TipoRelatorio                               │
│      - role tem permissão pra esse tipo (§4.2)                   │
│      - dataInicial <= dataFinal <= hoje                          │
│      - período <= 12 meses                                        │
│      - formato ∈ {PDF, CSV, XLSX}                                 │
│  • INSERT relatorio_job (status='PROCESSANDO', ...)               │
│  • Enfileira job → BullMQ / SQS / pg_notify                       │
│  • Retorna Relatorio { id, status: 'PROCESSANDO' } — 201          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. WORKER — processo async separado da API                       │
│                                                                   │
│  • Carrega job + snapshot RBAC do solicitante                     │
│  • Query no Postgres com WHERE prefeitura_id = :job.prefeitura_id│
│    (isolation automático · defensivo)                             │
│  • Aplica minimização de colunas por tipo (§5)                    │
│  • Renderiza CSV/XLSX/PDF com streaming → /tmp cifrado            │
│  • Calcula SHA-256 do arquivo (não-repúdio)                       │
│  • Upload pro object storage (S3/MinIO) com SSE + ACL privada    │
│  • UPDATE job: status=DISPONIVEL, storage_key, tamanho, hash     │
│  • Apaga /tmp                                                     │
│  • Erro → status=FALHA, erro_trace_id (nunca mensagem crua)       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. ENDPOINT HTTP — GET /relatorios/:id/download                  │
│                                                                   │
│  • Auth guard                                                     │
│  • SELECT onde:                                                   │
│      id = :id                                                     │
│      AND (gerado_por = :currentUserId                             │
│           OR (role = ADMIN                                         │
│               AND prefeitura_id = :currentPrefeituraId))          │
│      AND expira_em > now()                                        │
│      AND status = 'DISPONIVEL'                                    │
│  • Sem match → 404 (nunca 403 · isolation)                       │
│  • Stream do storage → resposta HTTP                              │
│  • Content-Type adequado + Content-Disposition: attachment        │
│  • INCREMENT downloads, INSERT audit_log                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Schema do banco (Postgres)

### 3.1 Tabela principal

```sql
CREATE TABLE relatorio_job (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  tipo            text NOT NULL,
  titulo          text NOT NULL,              -- backend monta, ex.: "Fila de Regulação · Abr/2026"
  periodo_inicio  date NOT NULL,
  periodo_fim     date NOT NULL,
  formato         text NOT NULL,              -- PDF | CSV | XLSX

  -- Estado
  status          text NOT NULL,              -- PROCESSANDO | DISPONIVEL | FALHA
  filtros         jsonb NOT NULL DEFAULT '{}', -- request original (auditoria)
  erro_trace_id   text,                        -- só traceId, nunca stack em claro

  -- Autoria & escopo (RBAC)
  gerado_por      uuid NOT NULL REFERENCES usuario(id),
  prefeitura_id   uuid NOT NULL REFERENCES prefeitura(id),
  ubs_id          uuid REFERENCES ubs(id),     -- NULL se relatório é prefeitura-wide

  -- Storage
  storage_key     text,                        -- S3 key, NULL enquanto processa
  content_type    text,                        -- application/pdf etc.
  tamanho_bytes   bigint,
  hash_sha256     text,                        -- não-repúdio

  -- Ciclo de vida
  criado_em       timestamptz NOT NULL DEFAULT now(),
  gerado_em       timestamptz,
  expira_em       timestamptz NOT NULL,        -- TTL 7 dias (§6)
  downloads       int NOT NULL DEFAULT 0,
  ultimo_download timestamptz
);

-- Índices essenciais
CREATE INDEX idx_relatorio_usuario
  ON relatorio_job (gerado_por, criado_em DESC);

CREATE INDEX idx_relatorio_prefeitura
  ON relatorio_job (prefeitura_id, criado_em DESC);

CREATE INDEX idx_relatorio_expira
  ON relatorio_job (expira_em)
  WHERE status = 'DISPONIVEL';

CREATE INDEX idx_relatorio_status
  ON relatorio_job (status, criado_em)
  WHERE status = 'PROCESSANDO';
```

### 3.2 Tabela de auditoria

```sql
CREATE TABLE relatorio_audit (
  id              bigserial PRIMARY KEY,
  relatorio_id    uuid NOT NULL REFERENCES relatorio_job(id),
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  acao            text NOT NULL,    -- CRIADO | DOWNLOAD | FALHA | EXPIRADO | EXCLUIDO
  ip              inet,
  user_agent      text,
  em              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_relatorio ON relatorio_audit (relatorio_id, em DESC);
CREATE INDEX idx_audit_usuario   ON relatorio_audit (usuario_id, em DESC);
```

> **Nunca apague da `relatorio_audit`.** Se precisar purgar `relatorio_job` por retenção,
> mantenha a auditoria por no mínimo **5 anos** (prazo do art. 37 da LGPD + boa prática
> para processos administrativos no setor público).

---

## 4. Matriz de permissões (RBAC)

### 4.1 Princípio

O backend é a fonte de verdade. A UI do frontend esconde botões por usabilidade,
mas **o backend nunca confia no cliente**. Qualquer `POST /relatorios` passa por:

1. JWT válido → extrai `role` e `escopo`
2. Tipo permitido para a role?
3. Escopo de dados **injetado automaticamente** na query (nunca vem do cliente)

### 4.2 Quem pode gerar o quê

| Tipo                                 | Roles permitidas                                            | Escopo automático dos dados                                |
| ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `PRODUCAO_INDIVIDUAL`                | ATENDENTE_UBS (só dele), COORDENADOR_UBS, REGULADOR_SMS, ADMIN | ATENDENTE → `gerado_por = :self`; COORDENADOR → sua UBS; SMS → prefeitura |
| `ENCAMINHAMENTOS_POR_ESPECIALIDADE`  | COORDENADOR_UBS, REGULADOR_SMS, ADMIN                       | UBS → `ubs_id = :self.ubsId`; SMS → `prefeitura_id = :self` |
| `FILA_REGULACAO`                     | REGULADOR_SMS, ADMIN                                        | `prefeitura_id = :self.prefeituraId`                        |
| `PENDENCIAS_RESOLVIDAS`              | COORDENADOR_UBS, REGULADOR_SMS, ADMIN                       | UBS ou prefeitura conforme role                             |
| `TFD_CUSTOS`                         | ADMIN, REGULADOR_SMS                                        | `prefeitura_id = :self.prefeituraId`                        |
| `VACINACAO_UBS`                      | COORDENADOR_UBS, ADMIN                                      | UBS ou prefeitura conforme role                             |
| `BUSCA_ATIVA`                        | COORDENADOR_UBS, ADMIN                                      | UBS ou prefeitura conforme role                             |

> `DESENVOLVEDOR` tem acesso a tudo (por design), mas **sempre logado em auditoria
> com destaque**. Considere adicionar um banner "atividade de engenharia" quando
> role=DESENVOLVEDOR baixar relatório nominal.

### 4.3 Error codes

Se o backend recusar a geração, o frontend espera os códigos abaixo no corpo:

```json
{ "error": { "code": "<CODE>", "message": "..." } }
```

| Código                      | HTTP | Significado                                           |
| --------------------------- | ---- | ----------------------------------------------------- |
| `TIPO_RELATORIO_INVALIDO`   | 400  | `tipo` não existe em `TipoRelatorio`                  |
| `PERIODO_INVALIDO`          | 400  | dataInicial > dataFinal, ou > 12 meses, ou futura     |
| `FORMATO_INVALIDO`          | 400  | formato ∉ {PDF, CSV, XLSX}                            |
| `PERMISSAO_INSUFICIENTE`    | 403  | Role não pode gerar esse tipo                         |
| `RATE_LIMIT_EXCEDIDO`       | 429  | Excedeu limite de gerações (§9)                       |
| `RELATORIO_NAO_DISPONIVEL`  | 409  | Download pedido antes do job terminar                 |
| `RELATORIO_EXPIRADO`        | 410  | Passou do TTL de 7 dias                               |
| `ERRO_INTERNO`              | 500  | Fallback — worker falhou, traceId está no corpo       |

---

## 5. Minimização de dados por tipo (art. 6º LGPD)

> **Regra de ouro:** cada tipo tem uma **lista de colunas definida no código**.
> Nunca devolva `SELECT *`. Se um dado não aparece na especificação abaixo, ele
> não sai do banco.

### 5.1 `FILA_REGULACAO` — operacional, **sem PII**

| Coluna            | Fonte                              | Notas                                |
| ----------------- | ---------------------------------- | ------------------------------------ |
| `protocolo`       | encaminhamento.protocolo           | Chave pública                        |
| `especialidade`   | encaminhamento.especialidade       |                                      |
| `prioridade`      | encaminhamento.prioridade          | ELETIVA/PRIORITARIA/URGENTE/...      |
| `ubs_origem`      | ubs.nome (da UBS de origem)        |                                      |
| `data_entrada`    | encaminhamento.enviado_regulacao_em | ISO                                  |
| `tempo_em_fila_h` | now() - enviado_regulacao_em        | Inteiro em horas                     |
| `sla_status`      | computed                            | DENTRO_SLA / EM_ATENCAO / ESTOURADO  |

**Não incluir:** CPF, nome do paciente, data de nascimento, CID, justificativa clínica.

### 5.2 `ENCAMINHAMENTOS_POR_ESPECIALIDADE` — **totalmente agregado**

| Coluna             | Agregação                         |
| ------------------ | --------------------------------- |
| `especialidade`    | GROUP BY                          |
| `total`            | COUNT(*)                          |
| `aprovados`        | COUNT WHERE status=APROVADO       |
| `rejeitados`       | COUNT WHERE status=REJEITADO      |
| `pendencias`       | COUNT WHERE status=PENDENCIA_...  |
| `tempo_medio_dias` | AVG(aprovado_em - enviado_em)     |

**Zero PII.** Pode ser baixado livremente por qualquer coordenador.

### 5.3 `PENDENCIAS_RESOLVIDAS`

| Coluna                  | Fonte                                           |
| ----------------------- | ----------------------------------------------- |
| `protocolo`             | encaminhamento.protocolo                        |
| `ubs_origem`            | ubs.nome                                        |
| `registrada_em`         | evento PENDENCIA_REGISTRADA.em                  |
| `resolvida_em`          | evento próximo APROVADO/reenvio                 |
| `tempo_resolucao_horas` | diff                                            |
| `motivo_categoria`      | enum ("DOCUMENTO_AUSENTE" / "DADOS_DIVERGENTES" / ...) |

Note: **não inclui** a justificativa textual da pendência — categoriza no backend.

### 5.4 `TFD_CUSTOS` — financeiro institucional

| Coluna          | Notas                                    |
| --------------- | ---------------------------------------- |
| `protocolo`     | Chave (não o nome do paciente)           |
| `destino`       | cidade/estado da viagem                  |
| `especialidade` |                                          |
| `data_viagem`   |                                          |
| `valor`         |                                          |
| `status`        | AGENDADO / REALIZADO / CANCELADO         |

### 5.5 `VACINACAO_UBS` — agregado por dose/vacina

| Coluna        | Agregação              |
| ------------- | ---------------------- |
| `ubs`         | GROUP BY               |
| `vacina`      | GROUP BY               |
| `campanha`    | GROUP BY               |
| `doses`       | COUNT(*)               |
| `faixa_etaria`| bucket (0-5, 6-17, 18-59, 60+) |

### 5.6 `BUSCA_ATIVA` — **modo padrão agregado**, modo nominal opt-in

**Modo agregado (default):**

| Coluna       | Agregação                    |
| ------------ | ---------------------------- |
| `bairro`     | GROUP BY                     |
| `microarea`  | GROUP BY                     |
| `quantidade` | COUNT(*)                     |

**Modo nominal (opt-in, requer justificativa):**
Se `filtros.incluirNomes === true`:
- Só permitido para `COORDENADOR_UBS` e `ADMIN`
- Exige `filtros.justificativa: string` (mín 30 chars) — gravado em `relatorio_audit.filtros`
- Metadata retorna `titulo` com sufixo "(NOMINAL)" e o arquivo leva banner "USO RESTRITO"
- Colunas adicionais: `nome`, `cartao_sus_mascarado` (`****1234`), `telefone_mascarado`, `endereco_bairro`
- **Nunca** inclui CPF completo — sempre os 3 dígitos centrais mascarados: `123.***.***-45`

### 5.7 `PRODUCAO_INDIVIDUAL` — RH interno

| Coluna             | Notas                                          |
| ------------------ | ---------------------------------------------- |
| `atendente_nome`   | Nome curto (primeiro + último sobrenome)       |
| `matricula`        | Chave de identidade funcional                  |
| `periodo`          |                                                |
| `total_ingeridos`  | Encaminhamentos criados                        |
| `aprovados`        |                                                |
| `pendencias`       |                                                |
| `tempo_medio_m`    | Tempo médio de consolidação (minutos)          |

ATENDENTE_UBS só vê o próprio registro. COORDENADOR_UBS vê toda sua equipe.

---

## 6. Ciclo de vida do arquivo

| Evento                          | Ação                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| Job criado                      | `status=PROCESSANDO`, `expira_em = now() + 7 days`           |
| Worker termina                  | `status=DISPONIVEL`, `storage_key`, `hash_sha256`, `tamanho` |
| Worker falha                    | `status=FALHA`, `erro_trace_id`                              |
| Download                        | `downloads++`, `ultimo_download=now()`, audit log            |
| Cron noturno (00:00)            | Se `expira_em < now()` → apaga do S3 + marca `EXPIRADO`      |
| Purge trimestral                | Rows com `status=EXPIRADO` há > 1 ano → DELETE; audit fica   |

---

## 7. Formatos — receita técnica

### 7.1 CSV

- **Encoding:** UTF-8 **com BOM** (`\uFEFF`) — Excel brasileiro abre bonito
- **Delimitador:** `,` (vírgula) · escape de vírgulas internas com aspas
- **Line ending:** `\r\n` (compatibilidade Windows)
- **Header da UNISISM (linhas comentadas com `#`):**
  ```
  # UNISISM · FILA_REGULACAO
  # Período: 01/04/2026 a 22/04/2026
  # Gerado por: SMS-047291 (Nome Abreviado)
  # Protocolo: REL-2026-000123
  # Hash SHA-256: a1b2c3...
  # USO INSTITUCIONAL · LGPD Art. 7º III
  ```
- Use streaming (ex.: `fast-csv` / `csv-stringify/stream` no Node) — não carrega em RAM
- Datas: `YYYY-MM-DD HH:mm` · Números: ponto decimal (`1234.56`)

### 7.2 XLSX

- Biblioteca sugerida: **`exceljs`** com `WorkbookWriter` (streaming)
- Aba 1 — **"Dados"**: as colunas do tipo
- Aba 2 — **"Metadados"**: key-value com filtros, usuário, período, hash SHA-256
- Formatação mínima:
  - Cabeçalho bold, fundo cinza claro
  - Freeze pane na linha 1
  - Coluna de datas formatada como `yyyy-mm-dd`
  - Largura auto-ajustada (max 40 chars)

### 7.3 PDF

- Biblioteca: **`pdfkit`** (puro) ou **`puppeteer`** (HTML → PDF)
- Prefira `pdfkit` se quiser reprodutibilidade de hash binário
- **Cabeçalho** (todas as páginas):
  - Brasão da prefeitura (opcional, se fornecido)
  - `UNISISM · <Prefeitura> · <TipoLegível>`
  - `Período: <dataInicial> – <dataFinal>`
- **Rodapé** (todas as páginas):
  - `Protocolo REL-2026-000123 · Página N de M`
  - `Gerado por: SMS-*** em <ISO>`
  - `USO INSTITUCIONAL · Lei 13.709/2018 Art. 7º III`
- **Marca d'água** diagonal **"CONFIDENCIAL"** se `tipo ∈ {PRODUCAO_INDIVIDUAL, TFD_CUSTOS, BUSCA_ATIVA nominal}`
- Numeração de linha em cada página de dados

---

## 8. Checklist LGPD — validar item a item antes de fazer deploy

- [ ] **Finalidade declarada** — cada `TipoRelatorio` tem comentário JSDoc/KDoc no código descrevendo a finalidade institucional (art. 7º I).
- [ ] **Necessidade / minimização** — lista de colunas por tipo implementada (§5). Auditoria de código confirma que nenhum `SELECT *` vai pro renderizador.
- [ ] **Isolation por prefeitura** — middleware/guard centralizado injeta `WHERE prefeitura_id = :jwt.prefeituraId`. Testes que tentam burlar o filtro falham com 404 (não 403).
- [ ] **Auditoria integral** — toda geração e todo download geram linha em `relatorio_audit`. Log inclui IP + user-agent. Retenção ≥ 5 anos.
- [ ] **Expiração automática** — cron funcional apagando S3 após 7 dias. Testado em staging.
- [ ] **Cifra em repouso** — S3 com SSE-KMS (ou SSE-S3 no mínimo) / MinIO com `MINIO_KMS_SECRET_KEY`. `/tmp` local apagado após upload.
- [ ] **URL não-enumerável** — `id` é UUID v4 aleatório. `storage_key` nunca aparece no JSON de resposta.
- [ ] **Rate limit** — máximo **10 POSTs/hora por usuário** e **3 gerações simultâneas por prefeitura**. Bucket Redis ou middleware próprio.
- [ ] **Não-repúdio** — `hash_sha256` gravado em todo relatório. Endpoint adicional `GET /relatorios/:id/verify` opcional que compara hash atual com o armazenado.
- [ ] **Mascaramento** — funções `mascararCPF()`, `mascararCartaoSus()`, `mascararNomeCompleto()` no domain layer. Testes unitários cobrindo edge cases.
- [ ] **Redaction em logs** — logger não imprime PII. Ex.: `logger.info({ relatorioId, tipo })` ✅ · nunca `logger.info({ query, params })` com dados crus.
- [ ] **Base legal documentada** — README/docs menciona: "tratamento de dados pessoais para execução de política pública de saúde, com base no art. 7º III e art. 11º, II, f da LGPD". Sem necessidade de consentimento.
- [ ] **Encarregado de Proteção de Dados (DPO)** — endpoint/contato documentado em `/sobre` ou footer do app.
- [ ] **Incident response** — runbook definido: se vazamento suspeito, procedimento de notificação ANPD em 72h (art. 48).
- [ ] **Backup criptografado** — dumps do Postgres + backups do S3 com chave rotacionada trimestral.

---

## 9. Rate limit & abuse prevention

Relatórios são o vetor mais fácil de **exfiltração por "insider"**. Mitigações:

| Limite                               | Valor sugerido                       |
| ------------------------------------ | ------------------------------------ |
| POSTs por usuário / hora             | 10                                   |
| POSTs por usuário / dia              | 30                                   |
| Gerações simultâneas / prefeitura    | 3                                    |
| Downloads mesmo relatório / usuário  | 5 (depois gera alerta ao DPO)        |
| Tamanho máximo por relatório         | 50 MB                                |
| Linhas máximas por relatório         | 500.000 (acima disso quebra em CSV)  |

Implementação: Redis com `INCR` + `EXPIRE`, ou `pg_bucket_4h_per_user` com UNIQUE index + função.

---

## 10. Estrutura de código sugerida (agnóstica de framework)

```
src/
├── modules/relatorios/
│   ├── domain/
│   │   ├── TipoRelatorio.ts         // enum + metadata (roles, colunas, titulo template)
│   │   ├── Relatorio.ts              // entity
│   │   └── mascarar.ts               // funções puras de mascaramento
│   ├── application/
│   │   ├── CriarRelatorioUseCase.ts  // valida + enfileira
│   │   ├── ListarRelatoriosUseCase.ts
│   │   ├── BaixarRelatorioUseCase.ts // stream autenticado
│   │   └── guards/
│   │       └── podeGerar.ts          // matriz RBAC do §4.2
│   ├── infrastructure/
│   │   ├── RelatorioJobRepository.ts // Postgres
│   │   ├── ObjectStorage.ts          // S3/MinIO
│   │   ├── Queue.ts                  // BullMQ/SQS
│   │   └── renderers/
│   │       ├── CsvRenderer.ts
│   │       ├── XlsxRenderer.ts
│   │       └── PdfRenderer.ts
│   ├── workers/
│   │   ├── RelatorioWorker.ts        // consome fila, chama renderer
│   │   └── ExpiracaoCron.ts          // limpa > 7d
│   └── http/
│       ├── RelatoriosController.ts   // 3 endpoints
│       └── schemas.ts                // Zod/class-validator DTOs
└── shared/
    ├── auth/JwtGuard.ts
    ├── lgpd/AuditLogger.ts
    └── lgpd/RateLimiter.ts
```

---

## 11. Fluxos de erro — comportamento esperado pelo frontend

### 11.1 POST `/relatorios` rejeitado

Frontend exibe o `message` do erro no banner vermelho (`RegistrarRespostaSUS.svelte`
já trata os códigos conhecidos). Envie sempre:

```json
{
  "error": {
    "code": "PERMISSAO_INSUFICIENTE",
    "message": "Você não tem permissão para gerar este tipo de relatório."
  }
}
```

### 11.2 Worker falhou

- Marca `status=FALHA`, `erro_trace_id='abc123'`
- Na próxima chamada `GET /relatorios`, o item aparece com `status=FALHA`
- Frontend mostra badge vermelho "FALHA" e **não permite download**
- O `erro_trace_id` **não é enviado ao frontend** — só para DPO/suporte

### 11.3 Download antes de estar pronto

- Frontend só habilita botão quando `status=DISPONIVEL`
- Se por algum motivo chegar requisição com `status=PROCESSANDO` → responda `409 RELATORIO_NAO_DISPONIVEL`

### 11.4 Download após expirar

- `expira_em < now()` → `410 RELATORIO_EXPIRADO`
- Frontend deve tratar mostrando: "Este relatório expirou. Gere novamente."
- (Hoje a UI trata com `alert()` genérico — é aceitável pra um relatório expirado.)

---

## 12. Checklist de entrega (ordem recomendada)

1. [ ] Tabelas `relatorio_job` e `relatorio_audit` criadas + migrations testadas
2. [ ] Enum `TipoRelatorio` no domain com metadata (roles permitidas, colunas, titulo template)
3. [ ] Use case `CriarRelatorio` (validação + INSERT + enqueue) com testes unitários
4. [ ] Worker mock que só marca DISPONIVEL com arquivo dummy (smoke test do fluxo)
5. [ ] Renderer CSV para **um tipo agregado** (`ENCAMINHAMENTOS_POR_ESPECIALIDADE` — o mais seguro)
6. [ ] Endpoint de download com guard de ownership/escopo + auditoria
7. [ ] Integração ponta-a-ponta com o frontend (o polling funciona?)
8. [ ] Renderer XLSX para o mesmo tipo
9. [ ] Renderer PDF (pdfkit) com cabeçalho/rodapé/marca d'água
10. [ ] Implementar os 6 tipos restantes (seguindo §5)
11. [ ] Cron de expiração + teste em staging
12. [ ] Rate limit + teste de abuso (100 POSTs seguidos devem bloquear)
13. [ ] Auditoria do DPO: baixar relatório, verificar audit_log, verificar hash
14. [ ] Runbook de incidente LGPD (notificação ANPD)
15. [ ] Deploy em produção **com feature flag** por prefeitura (liga gradualmente)

---

## 13. O que **NÃO** fazer

- ❌ **Gerar no frontend.** Nem CSV, nem PDF, nem preview. Toda PII fica no backend.
- ❌ **Expor `storage_key` ou URL direto do S3** no JSON de resposta. Sempre passe por `/relatorios/:id/download` para contar auditoria.
- ❌ **Criar endpoint "dry run"** que devolve JSON com os dados pré-renderização. Isso é um bypass do formato e escapa do rate limit.
- ❌ **Guardar senha do S3 em `.env` commitado.** Use AWS Secrets Manager / HashiCorp Vault / env do servidor.
- ❌ **Permitir que usuário baixe relatório de outro.** Guard obrigatório em `/download`.
- ❌ **Logar o request body cru** da criação. Os filtros podem conter PII se o tipo for nominal.
- ❌ **Deixar `/tmp` com arquivos pendentes.** Cleanup garantido via `try/finally` no worker.
- ❌ **Aceitar período > 12 meses.** Relatórios gigantes saturam o worker e aumentam risco de exfiltração em um único arquivo.

---

## 14. Referências

- **Lei 13.709/2018 (LGPD)** — especialmente arts. 6º (princípios), 7º (bases legais), 11º (dados sensíveis — saúde), 37 (registro de operações), 48 (comunicação de incidentes)
- **Resolução CNS 466/2012** — ética em pesquisa com dados de saúde
- **Portaria MS 1.383/2015** — uso do Cartão SUS e proteção de dados do cidadão
- **NIST SP 800-88 Rev.1** — sanitização de mídia (relevante para o cron de expiração)
- **OWASP ASVS v4.0.3** — V8 (Data Protection Requirements)

---

## Apêndice A · Tabela de decisão rápida

**Quando alguém pedir "adicionar um campo no relatório X":**

1. Esse campo está na especificação de `§5` para esse tipo? Se **não**, pare e documente a justificativa institucional.
2. É PII? Se **sim**, vai exigir opt-in + justificativa + audit log destacado.
3. A coluna existe em todas as prefeituras? Se a feature for opcional, derive de outro campo quando ausente ou omita a coluna.
4. Quebra compat com o contrato `Relatorio` do frontend? Se **sim**, não faça. O contrato do §1 é imutável — qualquer mudança exige pull request conjunto (backend + frontend + types).
5. Tem teste? Sem teste não sobe. Rate limit de relatório nominal novo = bug crítico por vazamento silencioso.

**Quando alguém pedir "novo `TipoRelatorio`":**

1. Adicione em `TipoRelatorio` (types.ts) — só 1 lugar, propaga pro frontend.
2. Adicione em `tiposDisponiveis` na tela `/sms/relatorios/+page.svelte` (card cosmético).
3. Defina no backend:
   - Roles permitidas (`§4.2`)
   - Colunas (`§5`)
   - Escopo de filtro
   - Template do `titulo`
   - Renderer (reutiliza CSV/XLSX/PDF base)
4. Escreva teste de permissão negativa (role errada → 403) **antes** do teste feliz.
5. Atualize este arquivo `RELATORIOS.md` com a nova linha em `§4.2` e `§5`.

---

*Última atualização: 2026-04-24. Dono: time de arquitetura do UNISISM. DPO: definir.*
