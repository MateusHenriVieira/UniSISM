# UNISISM · Face 4 (TFD / Gestão Logística) — Especificação de Backend

> Módulo de **gestão de frota** ponta-a-ponta para Tratamento Fora do Domicílio.
>
> Cobre: cadastro de veículos e motoristas · solicitações de viagem com anexo
> de comprovante · programação da frota · alocação de passageiros · controle de
> presença/faltas · abastecimento (solicitar/liberar/registrar comprovante) ·
> saldo orçamentário por veículo · ajudas de custo a pacientes · relatórios
> consolidados · **trilha de auditoria imutável encadeada criptograficamente
> para prestação de contas com o Tribunal de Justiça**.
>
> O frontend já consome todos esses contratos via `tfdMock` em
> `src/lib/api/tfd-mock.ts`. Quando o backend subir, basta criar
> `src/lib/api/client.ts` → `TfdApi` com os métodos abaixo e remover o mock.

**Versão:** v0.10 · **Última atualização:** 2026-04-30
**Frontend de referência:** `v0.1.0` (rotas `/tfd/*`, `tfd-types.ts`, `client.ts`, `erros-tfd.ts`).

> **v0.10 — Modo simplificado REGULADOR_TFD + paciente inline + relatório por especialidade (29/04/2026):**
> - Nova role `REGULADOR_TFD` (UI minimalista: dashboard + cadastro de solicitação) — escopo PREFEITURA.
> - `POST /v1/tfd/solicitacoes` aceita **paciente inline** (`paciente: DadosPacienteInline` com upsert por CPF)
>   ou `pacienteId` existente (XOR). Campo `acompanhante: DadosAcompanhante` obrigatório quando
>   `acompanhanteNecessario=true`.
> - Resposta `SolicitacaoTFD` ganhou `acompanhante`, `criadaPorId`, `criadaPorNome`.
> - Filtro `GET /v1/tfd/solicitacoes?criadaPorMim=true` (lista "minhas solicitações" — usado pelo dashboard
>   simplificado do REGULADOR_TFD).
> - Novo endpoint `GET /v1/tfd/relatorios/especialidades?desde=&ate=` (gestor/admin/dev) — agregador para
>   decisão estratégica "contratar especialista local vs. mandar fora".
> - `POST /v1/admin/usuarios` aceita roles `GESTOR_TFD` e `REGULADOR_TFD`. **GESTOR_TFD pode criar apenas
>   `REGULADOR_TFD`** (escalonamento controlado); outras roles → `403 PERMISSAO_INSUFICIENTE`.
> - **RBAC do `pagar` ajuda de custo e do `liberar`/`negar` abastecimento revisado**
>   (verification doc): voltou para **ADMIN/DEV apenas** — segregação financeira.
>   GESTOR_TFD continua solicitando abastecimento e registrando comprovante;
>   liberação/pagamento é privilégio admin.
> - Novos códigos de erro: `PACIENTE_OU_ID_OBRIGATORIO`, `PACIENTE_E_ID_CONFLITAM`,
>   `ACOMPANHANTE_OBRIGATORIO`, `ROLE_INVALIDA_TFD`, `JANELA_INVALIDA`.
> - Schema: `SolicitacaoTFD` ganhou `acompanhante Json?`, `criadaPorId String?`, `criadaPorNome String?`.
>
> **v0.9.0 — Saldo de Ajuda de Custo + Aportes + Hash-chain RFC 8785 + Idempotência (27/04/2026):**
> - Novo modelo `SaldoAjudaCusto` (único por prefeitura × mês, com tetos por categoria)
> - 8 endpoints novos: `/saldo/aportar`, `/saldo/aportes`, `/saldo-ajuda-custo` (GET/ajustar/aportar/aportes)
> - Aporte de frota com **rateio entre veículos ATIVO** (`rateioGeral=true`) — retorna array de `AporteSaldoFrota`
>   com mesmo `grupoRateioId`.
> - Reserva/liquidação de saldo na ajuda de custo (solicitar reserva, negar libera, pagar liquida)
> - Validação de teto por categoria + saldo disponível na criação de ajuda
> - Validação de combustível compatível (FLEX aceita GASOLINA/ETANOL; demais batem exato)
> - Hash-chain de auditoria migrado para **RFC 8785 (JCS)** — script `npm run tfd:rebuild-audit-chain`
> - Middleware `X-Idempotency-Key` (TTL 24h) em aportar/pagar/comprovante
> - Novos códigos: `SALDO_AJUDA_INSUFICIENTE`, `TETO_CATEGORIA_EXCEDIDO`, `APORTE_INVALIDO`, `APORTE_DOCUMENTO_OBRIGATORIO`, `APORTE_FONTE_INVALIDA`
> - **Detalhes da implementação:** ver [`TFD_BACKEND.md`](./TFD_BACKEND.md).
>
> **v0.8.2 — UX BlaBlaCar (25/04/2026):**
> - Criar viagem aceita `placa` (atalho de UX — backend resolve `veiculoId`); `vagasTotais` opcional (default = capacidade do veículo)
> - Solicitar abastecimento aceita `placa` + modo "valor direto" (`valorEstimado` em vez de `litros × preço`)
> - Alocar passageiro aceita `numeroAssento` opcional; `viagem.assentosOcupados[]` no GET; uniqueness garantida no DB
> - `POST /solicitacoes/:id/aprovar` aceita `alocacao: { viagemId, numeroAssento }` — aprova + aloca atomicamente
> - Novos códigos de erro: `ASSENTO_OCUPADO` (409), `ASSENTO_INVALIDO` (422), `VEICULO_REQUERIDO` (422), `VALOR_REQUERIDO` (422), `VALOR_INVALIDO` (422)

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura e princípios](#2-arquitetura-e-princípios)
3. [RBAC](#3-rbac)
4. [Schema do banco (Postgres)](#4-schema-do-banco)
5. [Endpoints HTTP](#5-endpoints-http)
6. [Auditoria TJ — cadeia imutável (RFC 8785)](#6-auditoria-tj)
7. [Regras de negócio críticas](#7-regras-de-negócio)
8. [Storage de comprovantes](#8-storage-de-comprovantes)
9. [Relatórios](#9-relatórios)
10. [Catálogo canônico de erros](#10-catálogo-canônico-de-erros)
11. [Conformidade legal](#11-conformidade-legal)
12. [Checklist de entrega](#12-checklist-de-entrega)

---

## 1. Visão geral

A Face 4 do UNISISM atende ao fluxo completo do **Tratamento Fora do
Domicílio** — quando um paciente precisa ser deslocado da UBS de origem
até uma unidade especializada (geralmente em outra cidade) e o município
custeia esse deslocamento.

### Atores

| Ator | Onde opera | O que faz |
|---|---|---|
| **UBS** (Face 1) | `/ubs/*` | Cria solicitação de viagem com comprovante de encaminhamento aprovado |
| **Gestor TFD** | `/tfd/*` | Aprova/nega solicitações, programa viagens, libera abastecimento, registra ajudas |
| **Motorista** | (futuro) app mobile | Recebe escala, registra hodômetro, anexa comprovantes |
| **Admin / Dev** | `/tfd/*` + `/sms/*` | Acompanha auditoria, ajusta saldos, gera relatórios consolidados |
| **Paciente** | App (Face 3) | Recebe notificação de viagem agendada, embarque |
| **Tribunal de Justiça / TCM** | (auditoria externa) | Consulta trilha imutável + ZIP mensal |

### Fluxo macro

```
1. UBS cria SolicitaçãoTFD (paciente + comprovante PDF)        ─┐
                                                                 │
2. Gestor TFD aprova/nega na fila                                │ Operação
                                                                 │
3. Gestor TFD cria Viagem programada e aloca solicitações       │
   → assigna Veiculo + Motorista                                 │
                                                                 │
4. Motorista vai abastecer:                                      │
   ABASTECIMENTO: solicita → gestor libera → registra cupom    │ Financeiro
                                                                 │
5. Antes de viajar: pagar AJUDA DE CUSTO ao paciente             │
   (alimentação, hospedagem, deslocamento local)                │
                                                                 │
6. Dia da viagem:                                                │
   - registra hodômetro inicial → INICIA                         │ Operação
   - marca presença (embarcou/faltou/desistiu) por passageiro    │
   - registra hodômetro final → CONCLUI                          │
                                                                 │
7. Tudo gera evento em ledger imutável (auditoria TJ)            │ Auditoria
                                                                 │
8. Fim do mês: relatório consolidado para prestação de contas    │ TCM/TJ
```

### Visão de telas

| Rota | Função |
|---|---|
| `/tfd/dashboard` | Visão geral · 4 KPIs · solicitações pendentes · saídas próximas |
| `/tfd/dashboard/solicitacoes` | Sub-aba — fila com filtro por status |
| `/tfd/dashboard/viagens-ativas` | Sub-aba — em rota + agendadas |
| `/tfd/solicitacoes` | Lista com busca + filtros |
| `/tfd/solicitacoes/[id]` | Detalhe + anexos + aprovar/negar |
| `/tfd/viagens` | Lista de toda a frota com calendário |
| `/tfd/viagens/nova` | Wizard: dados + alocação de solicitações |
| `/tfd/viagens/[id]` | Detalhe + iniciar/concluir/cancelar + presença |
| `/tfd/frota` | CRUD de veículos |
| `/tfd/frota/[id]` | Detalhe + histórico de viagens + abastecimentos |
| `/tfd/motoristas` | CRUD com alerta de CNH a vencer |
| `/tfd/motoristas/[id]` | Histórico de viagens do motorista |
| `/tfd/abastecimento` | Solicitar · liberar · registrar comprovante |
| `/tfd/saldo` | Orçamento mensal por veículo · ajuste auditado |
| `/tfd/ajuda-custo` | Pendentes · autorizar · pagar (PIX/transferência) |
| `/tfd/relatorios` | Consumo · faltas · produção motoristas · TJ |
| `/tfd/auditoria` | Trilha imutável encadeada (apenas Admin/Dev) |
| `/tfd/perfil` | Sessão ativa do gestor |

---

## 2. Arquitetura e princípios

### 2.1 Princípios

1. **Imutabilidade de operação financeira** — abastecimento, saldo, ajuda de custo. Nenhum registro é editado in-place; correções viram nova operação reversora.
2. **Anexos sempre escaneados** (ClamAV) — comprovantes têm `scanStatus: PENDENTE | LIMPO | INFECTADO | FALHOU`. Download só libera com `LIMPO`.
3. **Hash encadeado** em `tfd_audit_log` — cada registro tem `hash_anterior` + `hash` próprio (SHA-256). Adulteração quebra a cadeia.
4. **Isolation por prefeitura** — middleware central injeta `prefeitura_id` no `WHERE` de toda query. 404 em vez de 403.
5. **Backend rejeita** ações com saldo negativo, CNH vencida, capacidade excedida, transição de status inválida — frontend só esconde botões como UX.

### 2.2 Stack mínima sugerida

- Postgres 15+ com extensão `pgcrypto` (gen_random_uuid)
- Storage S3-compatible (MinIO, S3, GCS) com SSE-KMS
- ClamAV em sidecar pra scan de anexos
- BullMQ ou Postgres NOTIFY pra job de hash
- Logger redactor de PII

---

## 3. RBAC

| Recurso | Operação | GESTOR_TFD | REGULADOR_TFD | ADMIN | DEV | UBS roles |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Veículos / Motoristas | CRUD | ✅ | ❌ | ✅ | ✅ | ❌ |
| Veículos / Motoristas | DELETE físico | ❌ | ❌ | ✅ | ✅ | ❌ |
| Solicitações | criar (inline ou pacienteId) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitações | listar/ver | ✅ | ✅ (próprias) | ✅ | ✅ | ✅ |
| Solicitações | aprovar / negar / anexar | ✅ | ❌ | ✅ | ✅ | ❌ |
| Viagens | criar/editar/iniciar/concluir/cancelar/passageiros/presença | ✅ | ❌ | ✅ | ✅ | ❌ |
| Abastecimento | solicitar / comprovante | ✅ | ❌ | ✅ | ✅ | ❌ |
| Abastecimento | liberar / negar | ❌ | ❌ | ✅ | ✅ | ❌ |
| Saldo (frota e ajuda) | visualizar / aportar / listar aportes | ✅ | ❌ | ✅ | ✅ | ❌ |
| Saldo (frota e ajuda) | ajustar (sobrescreve) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ajuda de custo | criar / autorizar / negar | ✅ | ❌ | ✅ | ✅ | ❌ |
| Ajuda de custo | **pagar** | ❌ | ❌ | ✅ | ✅ | ❌ |
| Relatórios analíticos | `/relatorios/especialidades` | ✅ | ❌ | ✅ | ✅ | ❌ |
| Auditoria | ver trilha / verificar / exportar TJ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Cadastro de usuários TFD | criar `REGULADOR_TFD` | ✅ | ❌ | ✅ | ✅ | ❌ |
| Cadastro de usuários TFD | criar `GESTOR_TFD` ou outras | ❌ | ❌ | ✅ | ✅ | ❌ |

> **Nota REGULADOR_TFD (v0.10):** persona "balcão presencial" — cadastra
> solicitação TFD para o cidadão que vai à SMS sem passar pela UBS. UI
> minimalista (dashboard "minhas solicitações" + botão "Nova Solicitação").
> Pode usar `paciente: DadosPacienteInline` no POST (upsert por CPF) e
> opcionalmente `acompanhante: DadosAcompanhante`. Não aprova, não aloca,
> não vê frota/saldo/auditoria/relatórios.
>
> **Nota sobre solicitações UBS:** UBS continua criando encaminhamentos via
> Face 1, e a SMS pode gerar `SolicitaçãoTFD` ao aprovar encaminhamento
> com destino fora do município. Em paralelo, `POST /v1/tfd/solicitacoes`
> é exposto a UBS / REGULADOR_TFD / GESTOR_TFD para fluxo direto.
>
> **Nota sobre `pagar` ajuda de custo e `liberar`/`negar` abastecimento:**
> mantidos em **ADMIN/DEV apenas** (segregação financeira). GESTOR_TFD
> solicita abastecimento e registra comprovante; ADMIN libera/paga.

---

## 4. Schema do banco

### 4.1 Frota

```sql
CREATE TABLE tfd_veiculo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefeitura_id       uuid NOT NULL REFERENCES prefeitura(id),
  placa               text NOT NULL,
  modelo              text NOT NULL,
  tipo                text NOT NULL,           -- VAN | ONIBUS | CARRO | AMBULANCIA
  capacidade          int NOT NULL,
  ano                 int NOT NULL,
  combustivel         text NOT NULL,           -- DIESEL | GASOLINA | ETANOL | FLEX | GNV | ELETRICO
  consumo_medio_kml   numeric(5,2) NOT NULL,
  hodometro_atual_km  bigint NOT NULL DEFAULT 0,
  proxima_revisao_km  bigint,
  proxima_revisao_em  date,
  status              text NOT NULL DEFAULT 'ATIVO',  -- ATIVO | EM_MANUTENCAO | INATIVO
  criado_em           timestamptz NOT NULL DEFAULT now(),
  criado_por          uuid NOT NULL REFERENCES usuario(id),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  deletado_em         timestamptz,
  UNIQUE (placa) WHERE deletado_em IS NULL
);
```

### 4.2 Motoristas

```sql
CREATE TABLE tfd_motorista (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefeitura_id     uuid NOT NULL REFERENCES prefeitura(id),
  nome              text NOT NULL,
  cpf               text NOT NULL,                -- só dígitos (11)
  cnh               text NOT NULL,
  categoria_cnh     text NOT NULL,                -- B | C | D | E
  validade_cnh      date NOT NULL,
  telefone          text NOT NULL,
  status            text NOT NULL DEFAULT 'ATIVO', -- ATIVO | AFASTADO | INATIVO
  total_viagens     int NOT NULL DEFAULT 0,
  total_km_rodados  bigint NOT NULL DEFAULT 0,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  criado_por        uuid NOT NULL REFERENCES usuario(id),
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  deletado_em       timestamptz,
  UNIQUE (cpf) WHERE deletado_em IS NULL
);
```

### 4.3 Solicitações

```sql
CREATE TABLE tfd_solicitacao (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo                text UNIQUE NOT NULL,    -- TFD-AAAA-NNNNNN
  prefeitura_id            uuid NOT NULL REFERENCES prefeitura(id),
  paciente_id              uuid NOT NULL REFERENCES paciente(id),
  ubs_id                   uuid NOT NULL REFERENCES ubs(id),
  encaminhamento_origem_id uuid REFERENCES encaminhamento(id),
  destino                  text NOT NULL,
  unidade_destino          text,
  especialidade            text NOT NULL,
  motivo                   text NOT NULL,
  data_desejada            date NOT NULL,
  acompanhante_necessario  boolean NOT NULL DEFAULT false,
  prioridade               text NOT NULL,           -- ELETIVA | PRIORITARIA | URGENTE
  status                   text NOT NULL DEFAULT 'PENDENTE',
  observacoes              text,
  motivo_negacao           text,
  viagem_id                uuid REFERENCES tfd_viagem(id),
  criada_em                timestamptz NOT NULL DEFAULT now(),
  decidida_em              timestamptz,
  decidida_por             uuid REFERENCES usuario(id),
  deletada_em              timestamptz
);

CREATE TABLE tfd_solicitacao_anexo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id      uuid NOT NULL REFERENCES tfd_solicitacao(id),
  nome                text NOT NULL,
  tipo                text NOT NULL,                  -- COMPROVANTE_ENCAMINHAMENTO | EXAME | LAUDO | OUTRO
  tamanho_kb          int NOT NULL,
  storage_key         text NOT NULL,
  scan_status         text NOT NULL DEFAULT 'PENDENTE',
  upload_em           timestamptz NOT NULL DEFAULT now(),
  upload_por          uuid NOT NULL REFERENCES usuario(id)
);
```

### 4.4 Viagens

```sql
CREATE TABLE tfd_viagem (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefeitura_id            uuid NOT NULL REFERENCES prefeitura(id),
  data                     date NOT NULL,
  hora_saida               text NOT NULL,           -- HH:mm
  hora_prevista_retorno    text,
  veiculo_id               uuid NOT NULL REFERENCES tfd_veiculo(id),
  motorista_id             uuid NOT NULL REFERENCES tfd_motorista(id),
  destino                  text NOT NULL,
  unidade_destino          text,
  rota_resumo              text,
  km_estimados             int,
  km_inicial_hodometro     bigint,
  km_final_hodometro       bigint,
  vagas_totais             int NOT NULL,
  observacoes              text,
  status                   text NOT NULL DEFAULT 'AGENDADA',
  criada_em                timestamptz NOT NULL DEFAULT now(),
  criada_por               uuid NOT NULL REFERENCES usuario(id),
  iniciada_em              timestamptz,
  concluida_em             timestamptz,
  motivo_cancelamento      text
);

CREATE TABLE tfd_viagem_passageiro (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id       uuid NOT NULL REFERENCES tfd_viagem(id),
  solicitacao_id  uuid NOT NULL REFERENCES tfd_solicitacao(id),
  paciente_id     uuid NOT NULL REFERENCES paciente(id),
  acompanhante    boolean NOT NULL DEFAULT false,
  presenca        text NOT NULL DEFAULT 'AGUARDANDO',  -- AGUARDANDO | CONFIRMADO | EMBARCADO | AUSENTE | DESISTIU
  observacao      text,
  ajuda_custo_id  uuid REFERENCES tfd_ajuda_custo(id),
  marcado_em      timestamptz,
  marcado_por     uuid REFERENCES usuario(id)
);
```

### 4.5 Abastecimento + Saldo

```sql
CREATE TABLE tfd_abastecimento (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo                     text UNIQUE NOT NULL,   -- ABT-AAAA-NNNNNN
  prefeitura_id                 uuid NOT NULL REFERENCES prefeitura(id),
  veiculo_id                    uuid NOT NULL REFERENCES tfd_veiculo(id),
  motorista_id                  uuid REFERENCES tfd_motorista(id),
  viagem_id                     uuid REFERENCES tfd_viagem(id),
  posto                         text NOT NULL,
  litros                        numeric(8,2) NOT NULL DEFAULT 0,
  combustivel                   text NOT NULL,
  valor_por_litro               numeric(8,3) NOT NULL DEFAULT 0,
  valor_total                   numeric(12,2) NOT NULL,
  hodometro_km                  bigint NOT NULL,
  km_desde_ultimo_abastecimento int,
  consumo_calculado_kml         numeric(5,2),
  status                        text NOT NULL DEFAULT 'SOLICITADO',
  comprovante_storage_key       text,
  motivo_negacao                text,
  solicitado_em                 timestamptz NOT NULL DEFAULT now(),
  solicitado_por                uuid NOT NULL REFERENCES usuario(id),
  liberado_em                   timestamptz,
  liberado_por                  uuid REFERENCES usuario(id),
  realizado_em                  timestamptz
);

CREATE TABLE tfd_saldo_veiculo (
  veiculo_id            uuid NOT NULL REFERENCES tfd_veiculo(id),
  prefeitura_id         uuid NOT NULL REFERENCES prefeitura(id),
  mes                   text NOT NULL,             -- YYYY-MM
  saldo_mensal_brl      numeric(14,2) NOT NULL,
  saldo_consumido_brl   numeric(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (veiculo_id, mes)
);

CREATE TABLE tfd_saldo_ajuste (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id      uuid NOT NULL,
  mes             text NOT NULL,
  saldo_anterior  numeric(14,2) NOT NULL,
  saldo_novo      numeric(14,2) NOT NULL,
  justificativa   text NOT NULL,
  ajustado_por    uuid NOT NULL REFERENCES usuario(id),
  ajustado_em     timestamptz NOT NULL DEFAULT now()
);
```

### 4.6 Ajuda de Custo

```sql
CREATE TABLE tfd_ajuda_custo (
  id                                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo                          text UNIQUE NOT NULL,    -- AJC-AAAA-NNNNNN
  prefeitura_id                      uuid NOT NULL REFERENCES prefeitura(id),
  viagem_id                          uuid NOT NULL REFERENCES tfd_viagem(id),
  paciente_id                        uuid NOT NULL REFERENCES paciente(id),
  itens                              jsonb NOT NULL,         -- [{ categoria, descricao, valorBRL }]
  valor_total_brl                    numeric(12,2) NOT NULL,
  status                             text NOT NULL DEFAULT 'PENDENTE',
  metodo_pagamento                   text,                   -- PIX | TRANSFERENCIA | DINHEIRO_RH
  comprovante_pagamento_storage_key  text,
  motivo_negacao                     text,
  criada_em                          timestamptz NOT NULL DEFAULT now(),
  criada_por                         uuid NOT NULL REFERENCES usuario(id),
  autorizada_em                      timestamptz,
  autorizada_por                     uuid REFERENCES usuario(id),
  paga_em                            timestamptz,
  paga_por                           uuid REFERENCES usuario(id)
);
```

### 4.7 Auditoria (cadeia imutável TJ)

```sql
CREATE TABLE tfd_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefeitura_id       uuid NOT NULL REFERENCES prefeitura(id),
  acao                text NOT NULL,              -- ver enum AcaoAuditoriaTFD
  recurso_tipo        text NOT NULL,              -- VEICULO | MOTORISTA | ...
  recurso_id          uuid NOT NULL,
  recurso_protocolo   text,
  operador_id         uuid NOT NULL REFERENCES usuario(id),
  operador_nome       text NOT NULL,
  operador_matricula  text NOT NULL,
  operador_role       text NOT NULL,
  ip                  inet NOT NULL,
  user_agent          text NOT NULL,
  antes               jsonb,
  depois              jsonb,
  hash_anterior       text NOT NULL,             -- SHA-256 do registro anterior
  hash                text NOT NULL,             -- SHA-256(this | hash_anterior)
  em                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tfd_audit_prefeitura_em
  ON tfd_audit_log (prefeitura_id, em DESC);

CREATE INDEX idx_tfd_audit_recurso
  ON tfd_audit_log (recurso_tipo, recurso_id, em DESC);

-- TRIGGER que impede UPDATE/DELETE da tabela de auditoria.
CREATE OR REPLACE FUNCTION tfd_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'tfd_audit_log é imutável (LGPD/TJ).';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tfd_audit_no_update BEFORE UPDATE ON tfd_audit_log
  FOR EACH ROW EXECUTE FUNCTION tfd_audit_immutable();
CREATE TRIGGER tfd_audit_no_delete BEFORE DELETE ON tfd_audit_log
  FOR EACH ROW EXECUTE FUNCTION tfd_audit_immutable();
```

> **Retenção:** 20 anos. Compatível com prazo de prescrição administrativa
> em obras públicas (LC 101/2000).

---

## 5. Endpoints HTTP

Base: `/v1/tfd/`. Todos exigem `Authorization: Bearer <jwt>` e role compatível
(ver §3). Erros seguem o padrão `{ "error": { "code": "...", "message": "..." } }`.

### 5.1 Frota

| Método | Rota | Body / Query | Response |
|---|---|---|---|
| GET    | `/veiculos` | — | `(Veiculo & { totalViagens })[]` |
| POST   | `/veiculos` | `CriarVeiculoRequest` | `Veiculo` |
| GET    | `/veiculos/:id` | — | `Veiculo & { totalViagens, totalKmRodados, historicoViagens }` |
| PATCH  | `/veiculos/:id` | `AtualizarVeiculoRequest` | `Veiculo` |
| POST   | `/veiculos/:id/manutencao` | — | `Veiculo` (status=EM_MANUTENCAO) |
| POST   | `/veiculos/:id/reativar` | — | `Veiculo` (status=ATIVO) |
| DELETE | `/veiculos/:id` | — | 204 (soft delete · só DEV) |

**Listagem (`GET /veiculos`):** cada item inclui `totalViagens` (count de
todas as viagens da frota associadas, qualquer status). Computado em batch
via `groupBy` para evitar N+1.

**Detalhe (`GET /veiculos/:id`):** além do shape `Veiculo`, retorna:

```ts
interface VeiculoDetalhe extends Veiculo {
  totalViagens: number;         // count de todas as viagens
  totalKmRodados: number;       // soma (kmFinal - kmInicial) das CONCLUIDAS
  historicoViagens: ViagemHistoricoResumo[];
}

interface ViagemHistoricoResumo {
  id: string;
  data: string;                 // YYYY-MM-DD
  horaSaida: string;            // HH:mm
  horaPrevistaRetorno: string | null;
  destino: string;
  unidadeDestino: string | null;
  rotaResumo: string | null;
  status: 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  motorista: { id: string; nome: string } | null;
  vagasTotais: number;
  kmEstimados: number | null;
  kmInicialHodometro: number | null;
  kmFinalHodometro: number | null;
  kmRodados: number | null;     // null se não concluída
  observacoes: string | null;
  motivoCancelamento: string | null;
  iniciadaEm: string | null;    // ISO
  concluidaEm: string | null;   // ISO
  criadaEm: string;             // ISO
  passageiros: PassageiroHistoricoResumo[];
}

interface PassageiroHistoricoResumo {
  id: string;
  solicitacaoId: string;
  pacienteId: string;
  pacienteNome: string | null;
  numeroAssento: number | null;
  acompanhante: boolean;
  /**
   * Frontend filtra:
   *   - "viajaram" = presenca === 'EMBARCADO'
   *   - "faltaram" = presenca === 'AUSENTE' || presenca === 'DESISTIU'
   *   - "pendentes" = presenca === 'AGUARDANDO' || presenca === 'CONFIRMADO'
   */
  presenca: 'AGUARDANDO' | 'CONFIRMADO' | 'EMBARCADO' | 'AUSENTE' | 'DESISTIU';
  observacao: string | null;
  marcadoEm: string | null;     // ISO
}
```

Ordenação do `historicoViagens`: `data DESC, horaSaida DESC` (mais recentes
primeiro). Passageiros ordenados por `numeroAssento ASC`.

**Performance:** uma query única para o veículo + uma para as viagens (com
`include` aninhado de motorista e passageiros + paciente). Sem paginação por
ora — UI mostra a lista inteira no detalhe da frota.

### 5.2 Motoristas

| Método | Rota | Body / Query | Response |
|---|---|---|---|
| GET    | `/motoristas` | — | `Motorista[]` |
| POST   | `/motoristas` | `CriarMotoristaRequest` | `Motorista` |
| GET    | `/motoristas/:id` | — | `Motorista` |
| PATCH  | `/motoristas/:id` | `AtualizarMotoristaRequest` | `Motorista` |
| POST   | `/motoristas/:id/afastar` | — | `Motorista` |
| POST   | `/motoristas/:id/reativar` | — | `Motorista` |
| DELETE | `/motoristas/:id` | — | 204 (soft delete · só DEV) |

### 5.3 Solicitações TFD

| Método | Rota | Body / Query | Response |
|---|---|---|---|
| GET    | `/solicitacoes` | `?status=&prioridade=&q=&criadaPorMim=` | `SolicitacaoTFD[]` |
| POST   | `/solicitacoes` | `CriarSolicitacaoRequest` (paciente inline OU pacienteId) | `SolicitacaoTFD` |
| GET    | `/solicitacoes/:id` | — | `SolicitacaoTFD` |
| POST   | `/solicitacoes/:id/aprovar` | `{ observacoes?, alocacao? }` | `SolicitacaoTFD` |
| POST   | `/solicitacoes/:id/negar` | `{ motivo }` (mín. 10 chars) | `SolicitacaoTFD` |
| POST   | `/solicitacoes/:id/anexos` | `multipart/form-data { tipo, file }` | `AnexoSolicitacaoTFD` |
| GET    | `/anexos/:id/download` | — | binary (só `scanStatus=LIMPO`) |

**`CriarSolicitacaoRequest` (v0.10):**

```ts
interface CriarSolicitacaoRequest {
  // XOR — exatamente um dos dois é obrigatório
  pacienteId?: string;             // paciente já cadastrado
  paciente?: DadosPacienteInline;  // upsert por CPF (REGULADOR_TFD presencial)

  ubsId?: string;                  // opcional para REGULADOR_TFD
  encaminhamentoOrigemId?: string;
  destino: string;                 // município destino
  unidadeDestino?: string;
  especialidade: string;           // texto livre (frontend mostra sugestões)
  motivo: string;                  // ≥ 10 caracteres
  dataDesejada: string;            // YYYY-MM-DD ≥ hoje
  prioridade: 'ELETIVA' | 'PRIORITARIA' | 'URGENTE';
  acompanhanteNecessario?: boolean;
  acompanhante?: DadosAcompanhante; // OBRIGATÓRIO se acompanhanteNecessario=true
  observacoes?: string;
  prefeituraId?: string;           // só DEV/ADMIN podem forçar tenant
}

interface DadosPacienteInline {
  nome: string;
  cpf: string;                     // 11 dígitos sem máscara
  dataNascimento: string;          // YYYY-MM-DD
  sexo: 'M' | 'F' | 'OUTRO';
  telefone: string;
  endereco: string;
  cartaoSus?: string;
  nomeMae?: string;
  rg?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;                     // 2 letras
  cep?: string;
}

interface DadosAcompanhante {
  nome: string;
  cpf: string;                     // 11 dígitos
  dataNascimento: string;
  telefone: string;
  parentesco: 'CONJUGE' | 'FILHO_A' | 'PAI' | 'MAE' | 'IRMAO_A'
            | 'AVO' | 'NETO_A' | 'TIO_A' | 'SOBRINHO_A' | 'CUIDADOR' | 'OUTRO';
  rg?: string;
}
```

**Validações no POST:**

1. `paciente` XOR `pacienteId` — só um dos dois.
   - Nenhum → `400 PACIENTE_OU_ID_OBRIGATORIO`.
   - Os dois → `400 PACIENTE_E_ID_CONFLITAM`.
2. Quando `paciente` informado: backend faz **upsert por CPF** dentro da
   prefeitura — se já existe, mescla campos ausentes (preserva valores não
   vazios já cadastrados); senão cria novo `Paciente`.
3. `acompanhanteNecessario=true` ⇒ `acompanhante` obrigatório com todos os
   campos não-opcionais → senão `400 ACOMPANHANTE_OBRIGATORIO`.
4. `motivo.length ≥ 10`.
5. `dataDesejada ≥ hoje` (UTC-3).
6. RBAC: `REGULADOR_TFD` POST permitido; aprovar/negar bloqueados com
   `403 PERMISSAO_INSUFICIENTE`.

**Aprovar com alocação atômica:**

```ts
POST /v1/tfd/solicitacoes/:id/aprovar
{
  "observacoes": "ok",
  "alocacao": {
    "viagemId": "uuid",
    "numeroAssento": 5     // opcional — backend escolhe se omitido
  }
}
```

Quando `alocacao` informada, backend valida atomicamente: viagem na mesma
prefeitura, status `AGENDADA`, capacidade não excedida, assento livre. Se
qualquer passo falhar, devolve erro e **não** aprova a solicitação.

**Filtro `?criadaPorMim=true`:**

`GET /v1/tfd/solicitacoes?criadaPorMim=true` filtra por `criadaPorId === jwt.sub`.
Default `false`. Usado pelo dashboard simplificado do `REGULADOR_TFD` para
mostrar "minhas solicitações".

**Resposta `SolicitacaoTFD` — campos v0.10:**

```ts
interface SolicitacaoTFD {
  id: string;
  protocolo: string;             // TFD-AAAA-NNNNNN
  ...
  acompanhante: DadosAcompanhante | null;   // novo em v0.10
  criadaPorId: string | null;                // novo em v0.10
  criadaPorNome: string | null;              // novo em v0.10
  ...
}
```

### 5.4 Viagens

| Método | Rota | Body | Response |
|---|---|---|---|
| GET    | `/viagens` | `?status=&desde=&ate=` | `ViagemFrota[]` |
| POST   | `/viagens` | `CriarViagemRequest` | `ViagemFrota` |
| GET    | `/viagens/:id` | — | `ViagemFrota` |
| PATCH  | `/viagens/:id` | `AtualizarViagemRequest` | `ViagemFrota` |
| POST   | `/viagens/:id/iniciar` | `{ kmInicialHodometro }` | `ViagemFrota` |
| POST   | `/viagens/:id/concluir` | `{ kmFinalHodometro, observacoes? }` | `ViagemFrota` |
| POST   | `/viagens/:id/cancelar` | `{ motivo }` | `ViagemFrota` |
| POST   | `/viagens/:id/passageiros` | `{ solicitacaoId }` | `ViagemFrota` |
| DELETE | `/viagens/:id/passageiros/:pid` | — | `ViagemFrota` |
| POST   | `/viagens/:id/passageiros/:pid/presenca` | `{ presenca, observacao? }` | `ViagemFrota` |

**Validações importantes:**
- Não permitir `INICIAR` se há motorista com CNH vencida
- Não permitir `INICIAR` se veículo está EM_MANUTENCAO
- `vagas_ocupadas` calculado dinamicamente; backend recusa alocar se já cheio
- Transição válida: `AGENDADA → EM_ANDAMENTO → CONCLUIDA`. `* → CANCELADA` aceita; revertida apenas com aprovação ADMIN.

### 5.5 Abastecimento

| Método | Rota | Body | Response |
|---|---|---|---|
| GET    | `/abastecimentos` | `?status=&veiculoId=&desde=&ate=` | `Abastecimento[]` |
| POST   | `/abastecimentos` | `SolicitarAbastecimentoRequest` | `Abastecimento` (status=SOLICITADO) |
| POST   | `/abastecimentos/:id/liberar` | `{ observacao? }` | `Abastecimento` (status=LIBERADO) |
| POST   | `/abastecimentos/:id/negar` | `{ motivo }` | `Abastecimento` (status=NEGADO) |
| POST   | `/abastecimentos/:id/comprovante` | `multipart { litros, valorPorLitro, valorTotal, hodometroKm, file }` | `Abastecimento` (status=REALIZADO) |
| GET    | `/abastecimentos/:id/comprovante` | — | binary |

**Regras críticas:**
- `valorTotal` ao registrar comprovante NÃO pode exceder em mais de 5% o `valor_estimado` solicitado, exceto com aprovação adicional de ADMIN.
- Ao registrar `REALIZADO`: backend automaticamente debita do `tfd_saldo_veiculo` daquele mês.
- Saldo negativo bloqueia novas solicitações até ajuste explícito.

### 5.6 Saldo de Frota (combustível por veículo)

| Método | Rota | Body / Query | Response | RBAC |
|---|---|---|---|---|
| GET    | `/saldo` | `?mes=YYYY-MM` | `SaldoVeiculo[]` | gestor+ |
| POST   | `/saldo/ajustar` | `AjustarSaldoRequest` (sobrescreve) | `SaldoVeiculo` | **ADMIN/DEV** |
| POST   | `/saldo/aportar` | `AporteSaldoFrotaRequest` (soma) | `AporteSaldoFrota \| AporteSaldoFrota[]` | gestor+ |
| GET    | `/saldo/aportes` | `?mes=YYYY-MM&veiculoId=` | `AporteSaldoFrota[]` | gestor+ |

**`ajustar` × `aportar`:**

- `ajustar` **sobrescreve** `saldoMensal` do veículo. Use só para correções.
  Restrito a ADMIN/DEV. Auditoria: `SALDO_AJUSTADO`.
- `aportar` **soma** ao `saldoMensal` (crédito). Vincula a empenho/portaria.
  Disponível ao gestor TFD. Auditoria: `SALDO_APORTADO`.

**`AporteSaldoFrotaRequest`:**

```json
{
  "veiculoId": "uuid",
  "rateioGeral": false,
  "mes": "2026-04",
  "valorBRL": 5000.00,
  "fonte": "EMPENHO",
  "numeroDocumento": "2026NE000123",
  "descricaoFonte": null,
  "justificativa": "aporte mensal regular para combustível"
}
```

**Validações:**

- `valorBRL > 0` → senão `422 APORTE_INVALIDO`.
- `justificativa.length ≥ 10` → senão `422 JUSTIFICATIVA_OBRIGATORIA`.
- `fonte ∈ {EMPENHO, PORTARIA}` ⇒ `numeroDocumento` obrigatório
  → `422 APORTE_DOCUMENTO_OBRIGATORIO`.
- `fonte = OUTRO` ⇒ `descricaoFonte` obrigatório → `422 APORTE_FONTE_INVALIDA`.
- `rateioGeral=true`: `veiculoId` deve ser `null`/omitido. Backend divide
  `valorBRL` em partes iguais entre veículos `ATIVO` (resto na primeira placa
  alfabeticamente), cria N registros `AporteSaldoFrota` no mesmo
  **`grupoRateioId`** (UUID) e devolve **array**. Toda a operação é uma
  única chamada com 1 X-Idempotency-Key.
- `rateioGeral=false`: `veiculoId` é obrigatório → senão validação Zod 400.

**Idempotência:** `X-Idempotency-Key` aceito (TTL 24h).

### 5.7 Saldo de Ajuda de Custo (orçamento global mensal)

| Método | Rota | Body / Query | Response | RBAC |
|---|---|---|---|---|
| GET    | `/saldo-ajuda-custo` | `?mes=YYYY-MM` | `SaldoAjudaCusto` | gestor+ |
| POST   | `/saldo-ajuda-custo/ajustar` | `AjustarSaldoAjudaCustoRequest` | `SaldoAjudaCusto` | **ADMIN/DEV** |
| POST   | `/saldo-ajuda-custo/aportar` | `AporteSaldoAjudaCustoRequest` | `AporteSaldoAjudaCusto` | gestor+ |
| GET    | `/saldo-ajuda-custo/aportes` | `?mes=YYYY-MM` | `AporteSaldoAjudaCusto[]` | gestor+ |

**`SaldoAjudaCusto`** — único registro por `(prefeitura, mês)`:

```json
{
  "prefeituraId": "uuid",
  "mes": "2026-04",
  "saldoMensal": 25000.00,
  "saldoConsumido": 8400.00,
  "saldoReservado": 1200.00,
  "saldoDisponivel": 15400.00,
  "tetoAlimentacao": 80.00,
  "tetoHospedagem": 250.00,
  "tetoDeslocamento": 60.00,
  "atualizadoEm": "2026-04-25T14:30:00Z"
}
```

**`GET` placeholder:** se não houver registro no mês, devolve placeholder
zerado (`saldoMensal=0`, tetos=0) com `atualizadoEm=null`. **Não** retorna
404 — frontend trata como "ainda sem orçamento alocado".

**Tetos por categoria:** valor máximo por item de ajuda de custo. `0` = sem
teto. Aplicados na criação de ajuda (§5.8) → `TETO_CATEGORIA_EXCEDIDO`.

**`AjustarSaldoAjudaCustoRequest`** (sobrescreve):

```json
{
  "mes": "2026-04",
  "novoSaldoMensal": 30000,
  "tetoAlimentacao": 90,
  "tetoHospedagem": 250,
  "tetoDeslocamento": 60,
  "justificativa": "revisão dos tetos conforme Portaria SMS 047/2026"
}
```

**`AporteSaldoAjudaCustoRequest`** — mesma validação de fonte/documento que
aporte de frota. Auditoria: `SALDO_AJUDA_APORTADO`. Idempotência aceita.

### 5.8 Ajuda de Custo

| Método | Rota | Body | Response | RBAC |
|---|---|---|---|---|
| GET    | `/ajudas-custo` | `?status=&pacienteId=` | `AjudaCusto[]` | gestor+ |
| GET    | `/ajudas-custo/:id` | — | `AjudaCusto` | gestor+ |
| POST   | `/ajudas-custo` | `SolicitarAjudaCustoRequest` | `AjudaCusto` | gestor+ |
| POST   | `/ajudas-custo/:id/autorizar` | — | `AjudaCusto` | gestor+ |
| POST   | `/ajudas-custo/:id/negar` | `{ motivo }` | `AjudaCusto` | gestor+ |
| POST   | `/ajudas-custo/:id/pagar` | `multipart { metodoPagamento, file }` | `AjudaCusto` | **ADMIN/DEV** |

> **`pagar` é ADMIN/DEV** (verification doc §19) — segregação financeira.
> GESTOR_TFD pode `criar`/`autorizar`/`negar` ajudas de custo, mas o
> pagamento efetivo é privilégio admin.

**`SolicitarAjudaCustoRequest`:**

```json
{
  "viagemId": "uuid",
  "pacienteId": "uuid",
  "itens": [
    { "categoria": "ALIMENTACAO", "descricao": "2 refeições", "valorBRL": 70.00 },
    { "categoria": "DESLOCAMENTO_LOCAL", "descricao": "Táxi UBS↔hospital", "valorBRL": 50.00 }
  ]
}
```

**Validações:**

- `itens.length ≥ 1` → `422 ITENS_OBRIGATORIOS`.
- Cada `valorBRL > 0` → `422 VALOR_INVALIDO`.
- Paciente precisa ser **passageiro alocado** na viagem.
- `(viagemId, pacienteId)` único entre ajudas ativas → `409 AJUDA_DUPLICADA`.
- Para cada item: `valorBRL ≤ teto_categoria` (se teto > 0)
  → `422 TETO_CATEGORIA_EXCEDIDO`.
- `valorTotal = sum(itens.valorBRL)`.
- **Reserva** `saldoReservado += valorTotal` em `SaldoAjudaCusto`. Se
  `saldoDisponivel < valorTotal` → `422 SALDO_AJUDA_INSUFICIENTE`.

**Transições de saldo:**

| Ação | Efeito em `SaldoAjudaCusto` |
|---|---|
| `solicitar` | `saldoReservado += valorTotal` |
| `negar` (PENDENTE) | `saldoReservado -= valorTotal` (libera) |
| `pagar` (AUTORIZADA) | `saldoReservado -= valorTotal` && `saldoConsumido += valorTotal` |

**Idempotência:** `X-Idempotency-Key` aceito no `pagar` (TTL 24h).

### 5.9 Auditoria

| Método | Rota | Body / Query | Response |
|---|---|---|---|
| GET    | `/auditoria` | `?recursoTipo=&recursoId=&desde=&ate=` | `RegistroAuditoriaTFD[]` |
| GET    | `/auditoria/:id` | — | `RegistroAuditoriaTFD` |
| GET    | `/auditoria/verificar` | `?prefeituraId=` (opcional, DEV/ADMIN) | `{ total, corrompidos: string[] }` |
| GET    | `/auditoria/exportar-tj?mes=YYYY-MM` | — | ZIP com CSVs + manifest hash |

**Apenas ADMIN/DEV.** Endpoint imutável — nunca aceita POST/PATCH/DELETE.

`verificar` recomputa o hash de cada registro com **canonicalização RFC 8785
(JCS)** e devolve `corrompidos: id[]` para os que divergem. Cadeia íntegra
→ `corrompidos: []`. Útil para auditor verificar antes de exportar.

### 5.10 Relatórios analíticos

| Método | Rota | Query | Response | RBAC |
|---|---|---|---|---|
| GET    | `/relatorios/especialidades` | `?desde=&ate=&prefeituraId=` | `RelatorioEspecialidades` | gestor+ |

Endpoint **agregador** que fundamenta a decisão "contratar especialista local
vs. continuar mandando paciente fora". Bloqueado para `REGULADOR_TFD` →
`403 PERMISSAO_INSUFICIENTE`.

**Query:**

| Param | Tipo | Default |
|---|---|---|
| `desde` | `YYYY-MM-DD` | hoje − 12 meses |
| `ate` | `YYYY-MM-DD` | hoje |
| `prefeituraId` | string (DEV/ADMIN) | JWT |

**Response:**

```json
{
  "periodo": { "desde": "2025-04-30", "ate": "2026-04-30" },
  "totalGeralSolicitacoes": 437,
  "totalGeralCustoBRL": 184250.72,
  "itens": [
    {
      "especialidade": "OFTALMOLOGIA",
      "totalSolicitacoes": 132,
      "totalRealizadas": 121,
      "totalPendentes": 6,
      "totalNegadas": 5,
      "pacientesUnicos": 98,
      "destinosMaisFrequentes": ["Recife/PE", "Caruaru/PE"],
      "custoEstimadoBRL": 67200.00,
      "custoMedioPorViagemBRL": 509.09
    }
  ]
}
```

**Cálculo do `custoEstimadoBRL`** (por especialidade):

- Soma do `valorTotal` dos abastecimentos das viagens com passageiros dessa
  especialidade, **rateado** por `passageiros.length` (viagens mistas pesam
  proporcionalmente).
- + soma do `valorTotal` das ajudas de custo `PAGA` cujas `viagemId` apontam
  para essas viagens.

`custoMedioPorViagemBRL = custoEstimadoBRL / totalRealizadas` (0 se denominador 0).

**Validação:** `desde > ate` → `400 JANELA_INVALIDA`.

**Cache:** Redis TTL 1h (chave
`tfd:relatorios:especialidades:{prefeituraId}:{desde}:{ate}`). GET puro
— **não** grava em auditoria.

### 5.11 Relatórios assíncronos (legado)

Reaproveita o módulo `Relatorio` existente com `TipoRelatorioTFD`:

```
CONSUMO_FROTA · FALTAS_PACIENTES · FALTAS_INDIVIDUAL ·
PRESTACAO_CONTAS_TJ · AJUDAS_CUSTO_PAGAS · PRODUCAO_MOTORISTAS
```

Geração assíncrona com `POST /v1/relatorios` retornando `id` para polling.

---

## 6. Auditoria TJ

### 6.1 Cadeia criptográfica (RFC 8785)

Cada operação relevante (ver enum `AcaoAuditoriaTFD`) gera linha em
`tfd_audit_log`. O hash é encadeado:

```text
hash = SHA-256( hash_anterior || canonical_json(payload) )

payload = { acao, recursoTipo, recursoId, recursoProtocolo?,
            operadorId, operadorMatricula, operadorRole,
            ip, em (ISO 8601), antes?, depois? }
```

`canonical_json` segue **JSON Canonicalization Scheme — RFC 8785 (JCS)**:
chaves ordenadas lexicograficamente, sem espaços, números canonicalizados.
Garante hash reprodutível mesmo entre runtimes diferentes.

`hash_anterior` é o `hash` do último registro inserido na **mesma prefeitura**
(escopo do tenant). Genesis = `'0' × 64`.

### 6.2 Verificação de integridade

```http
GET /v1/tfd/auditoria/verificar
GET /v1/tfd/auditoria/verificar?prefeituraId=<uuid>   # DEV / ADMIN_GLOBAL
```

Backend percorre todos os registros do tenant em ordem cronológica,
recomputa o hash com `canonical_json` e compara com o armazenado.

**Resposta:**

```json
{
  "total": 1834,
  "corrompidos": []         // lista de id[] dos registros com hash divergente
}
```

Cadeia íntegra → `corrompidos: []`. RBAC: ADMIN/DEV. Útil rodar antes de
`exportar-tj` para garantir manifest hígido.

> **Nota de migração:** se o backend rodou antes da v0.9 (canonicalização não-RFC),
> rodar `npm run tfd:rebuild-audit-chain` antes do primeiro `verificar` em
> produção — recomputa toda a cadeia com o algoritmo correto.

### 6.3 Exportação para TJ

`GET /v1/tfd/auditoria/exportar-tj?mes=YYYY-MM` retorna ZIP contendo:

- `auditoria.csv` — todos registros do mês
- `viagens.csv` — viagens do mês com hodômetros e KM rodados
- `abastecimentos.csv` — todos com valor + comprovante (link)
- `ajudas-custo.csv` — todos pagamentos
- `saldo-mensal.csv` — saldo inicial, movimentos, saldo final por veículo
- `manifest.json`:
  ```json
  {
    "mes": "2026-04",
    "prefeitura": "...",
    "geradoEm": "2026-05-01T00:00:00Z",
    "geradoPor": "Carlos Henrique Frota (TFD-001)",
    "totalRegistros": 1834,
    "hashInicial": "abc...",
    "hashFinal": "xyz...",
    "hashManifesto": "SHA-256 do conteúdo deste manifest"
  }
  ```

O ZIP é assinado digitalmente (XMLDSig ou ICP-Brasil se configurado) e
disponibilizado como relatório do tipo `PRESTACAO_CONTAS_TJ`.

---

## 7. Regras de negócio

1. **Capacidade:** ao alocar passageiro, backend valida `passageiros.length < veiculo.capacidade`.
2. **Cancelamento:** cancelar viagem libera as solicitações alocadas (status volta para `APROVADA`).
3. **Hodômetro:** `kmFinal > kmInicial` sempre. Se anterior, recusa.
4. **CNH:** ao iniciar viagem, backend bloqueia se `motorista.validade_cnh < hoje + 1`.
5. **Saldo:** abastecimento `LIBERADO` reserva valor estimado; `REALIZADO` debita real e libera o reservado.
6. **Faltas:** após **3 ausências em 6 meses**, paciente entra em flag `bloqueado=true` (frontend mostra alerta na criação de nova solicitação). Job mensal recalcula.
7. **Idempotência de pagamento:** ajuda de custo só pode ser paga se `status=AUTORIZADA`. Repetir requisição retorna o mesmo registro (header `Idempotency-Key` opcional).
8. **Comprovante obrigatório:** `REALIZADO` (abastecimento) e `PAGA` (ajuda) exigem anexo válido (`scanStatus=LIMPO`). Backend recusa sem.

---

## 8. Storage de comprovantes

### 8.1 Estrutura S3

```
s3://unisism-tfd/<prefeituraId>/<ano>/<mes>/<recurso>/<id>.<ext>
```

Exemplos:
```
.../comprovantes-encaminhamento/abc-uuid.pdf
.../comprovantes-abastecimento/xyz-uuid.pdf
.../comprovantes-pagamento-ajuda/def-uuid.pdf
```

### 8.2 ClamAV scan

- Upload entra em `scan_status='PENDENTE'`
- Job assíncrono passa pelo daemon ClamAV
- Resultado: `LIMPO` (libera download) · `INFECTADO` (bloqueia, notifica DPO) · `FALHOU` (re-tenta 3x, depois marca `FALHOU` para inspeção manual)

### 8.3 SSE

Sempre `SSE-KMS` com chave gerenciada pela prefeitura. Acesso via URLs
pré-assinadas com TTL de 60s — cliente sempre passa pelo backend para baixar
(controle de auditoria).

---

## 9. Relatórios

| Tipo | Roles | Conteúdo |
|---|---|---|
| `CONSUMO_FROTA` | GESTOR_TFD+ | Por veículo: km rodados, litros, R$, consumo médio, saldo restante |
| `FALTAS_PACIENTES` | GESTOR_TFD+ | Lista pacientes com taxa de falta acima de 30% no período |
| `FALTAS_INDIVIDUAL` | GESTOR_TFD+ | Detalhe por paciente com lista de viagens marcadas como ausente/desistência |
| `AJUDAS_CUSTO_PAGAS` | GESTOR_TFD+ | Lista de pagamentos com comprovante (link) por período |
| `PRODUCAO_MOTORISTAS` | GESTOR_TFD+ | Por motorista: total viagens, km, ausências em escala |
| `PRESTACAO_CONTAS_TJ` | ADMIN+ | ZIP completo (§6.3) com cadeia hash íntegra |

Geração assíncrona via job; status `PROCESSANDO → DISPONIVEL → FALHA`. TTL
de download: 7 dias (SSE-KMS).

---

## 10. Catálogo canônico de erros

Frontend traduz pelo `code` (estável); **nunca** pelo `message`. Formato:

```json
{
  "error": {
    "code": "SALDO_INSUFICIENTE",
    "message": "Saldo do mês insuficiente para reservar R$ 850,00.",
    "details": {
      "veiculoId": "...",
      "saldoDisponivel": 300.00,
      "valorSolicitado": 850.00
    }
  }
}
```

| Code | HTTP | Quando |
|---|:---:|---|
| `PAYLOAD_INVALIDO` | 400 | Schema do body inválido / tipos errados |
| `PACIENTE_OU_ID_OBRIGATORIO` | 400 | `POST /solicitacoes` sem `paciente` nem `pacienteId` |
| `PACIENTE_E_ID_CONFLITAM` | 400 | `POST /solicitacoes` com os dois |
| `ACOMPANHANTE_OBRIGATORIO` | 400 | `acompanhanteNecessario=true` sem `acompanhante` |
| `JANELA_INVALIDA` | 400 | `desde > ate` no relatório |
| `NAO_AUTENTICADO` | 401 | Sem token / token inválido |
| `TOKEN_EXPIRADO` | 401 | Token expirado |
| `ROLE_NAO_PERMITIDO` / `PERMISSAO_INSUFICIENTE` | 403 | Role autenticada sem permissão |
| `VEICULO_NAO_ENCONTRADO` | 404 | Veículo inexistente / outra prefeitura |
| `MOTORISTA_NAO_ENCONTRADO` | 404 | — |
| `SOLICITACAO_NAO_ENCONTRADA` | 404 | — |
| `VIAGEM_NAO_ENCONTRADA` | 404 | — |
| `ABASTECIMENTO_NAO_ENCONTRADO` | 404 | — |
| `AJUDA_NAO_ENCONTRADA` | 404 | — |
| `ANEXO_NAO_ENCONTRADO` | 404 | — |
| `PLACA_DUPLICADA` | 409 | Placa já existe (status ≠ INATIVO) |
| `CPF_DUPLICADO` | 409 | CPF de motorista já existe |
| `STATUS_INVALIDO` | 409 | Operação no status atual não permitida |
| `STATUS_TERMINAL` | 409 | Recurso já em estado terminal |
| `VIAGEM_STATUS_INVALIDO` | 409 | Viagem cancelada/concluída — não aceita passageiros |
| `ASSENTO_OCUPADO` | 409 | Assento já alocado |
| `CAPACIDADE_EXCEDIDA` | 409 | Viagem cheia |
| `AJUDA_DUPLICADA` | 409 | Já existe ajuda ativa para `(viagem, paciente)` |
| `VEICULO_EM_USO` | 409 | DELETE veículo com viagens ativas |
| `MOTORISTA_EM_USO` | 409 | DELETE motorista com viagens ativas |
| `ANEXO_NAO_LIBERADO` | 409 | Anexo ainda em scan antimalware |
| `COMPROVANTE_AUSENTE` | 422 | Pagar/realizar sem ter feito upload |
| `VEICULO_REQUERIDO` | 422 | Faltou `veiculoId`/`placa` |
| `VALOR_REQUERIDO` | 422 | Faltou valor estimado |
| `VALOR_INVALIDO` | 422 | Valor ≤ 0 |
| `ASSENTO_INVALIDO` | 422 | Fora do range `1..vagasTotais` |
| `VAGAS_INVALIDAS` | 422 | `vagasTotais ≤ 0` |
| `VAGAS_EXCEDEM_CAPACIDADE` | 422 | `vagasTotais > veiculo.capacidade` |
| `CNH_VENCIDA` | 422 | Motorista com CNH vencida |
| `MOTORISTA_INDISPONIVEL` | 422 | Motorista AFASTADO/INATIVO |
| `VEICULO_INDISPONIVEL` | 422 | Veículo EM_MANUTENCAO/INATIVO |
| `HODOMETRO_INVALIDO` | 422 | Hodômetro retroativo |
| `SALDO_INSUFICIENTE` | 422 | Saldo de frota insuficiente |
| `SALDO_AJUDA_INSUFICIENTE` | 422 | Saldo de ajuda de custo insuficiente |
| `APORTE_INVALIDO` | 422 | `valorBRL ≤ 0` no aporte |
| `APORTE_FONTE_INVALIDA` | 422 | Fonte = OUTRO sem `descricaoFonte` |
| `APORTE_DOCUMENTO_OBRIGATORIO` | 422 | Fonte = EMPENHO/PORTARIA sem `numeroDocumento` |
| `TETO_CATEGORIA_EXCEDIDO` | 422 | Item de ajuda excede teto da categoria |
| `VALOR_EXCEDE_LIMITE` | 422 | Comprovante > 105% do estimado |
| `MOTIVO_OBRIGATORIO` | 422 | Motivo < 10 chars |
| `JUSTIFICATIVA_OBRIGATORIA` | 422 | Justificativa < 10 chars |
| `SOLICITACAO_NAO_APROVADA` | 422 | Tentativa de alocar `PENDENTE` |
| `DATA_INVALIDA` | 422 | Data fora do formato/intervalo |
| `CPF_INVALIDO` | 422 | CPF ≠ 11 dígitos |
| `VALIDADE_CNH_INVALIDA` | 422 | Validade CNH inválida |
| `ITENS_OBRIGATORIOS` | 422 | Ajuda sem itens |
| `VIAGEM_REALIZADA_IMUTAVEL` | 422 | Cancelar viagem `CONCLUIDA` |
| `TRANSICAO_INVALIDA` | 422 | Transição não permitida na máquina de estado |
| `ROLE_INVALIDA_TFD` | 422 | GESTOR_TFD criando role ≠ REGULADOR_TFD |
| `MIME_NAO_SUPORTADO` | 415 | Upload com MIME ≠ pdf/jpeg/png |
| `ERRO_INTERNO` | 500 | Genérico |

---

## 11. Conformidade legal

| Norma | Aplicação |
|---|---|
| **LGPD 13.709/2018** | Art. 7º III — execução de política pública. Anexos com PDF têm scan + cifra em repouso. Trilha de auditoria 20 anos. |
| **LC 101/2000 (LRF)** | Lei de Responsabilidade Fiscal · saldo mensal por veículo + ajuste auditado preserva trilha de gasto público. |
| **Lei 14.133/2021 (Licitações)** | Veículos próprios e compras de combustível precisam ter trilha de origem · cada abastecimento com nota fiscal. |
| **Res. CFM 1.821/2007** | Documentos clínicos do paciente (encaminhamento) são prontuário · 20 anos. |
| **Lei 8.080/1990 (SUS)** | TFD é direito do usuário do SUS · documentação obrigatória. |
| **Portaria GM/MS 55/1999** | Tratamento Fora do Domicílio — fluxo, regras, ajuda de custo. |

---

## 12. Checklist de entrega

### Schema
- [x] Modelos Prisma (`tfd_veiculos`, `tfd_motoristas`, `tfd_solicitacoes`,
      `tfd_solicitacao_anexos`, `tfd_viagens`, `tfd_viagem_passageiros`,
      `tfd_abastecimentos`, `tfd_saldo_veiculo`, `tfd_saldo_ajustes`,
      `tfd_saldo_frota_aportes`, `tfd_saldo_ajuda_custo`,
      `tfd_saldo_ajuda_aportes`, `tfd_saldo_ajuda_ajustes`,
      `tfd_ajudas_custo`, `tfd_audit_log`, `tfd_idempotency_keys`)
- [x] `SolicitacaoTFD.acompanhante Json?` + `criadaPorId String?` + `criadaPorNome String?` (v0.10)
- [x] `AporteSaldoFrota.grupoRateioId String?` (v0.9)
- [x] Job mensal de criação de saldos (`SaldoMensalCron`)
- [x] Hash-chain RFC 8785 — script `npm run tfd:rebuild-audit-chain`

### Endpoints (48 rotas — v0.10)
- [x] Frota: 7 rotas
- [x] Motoristas: 7 rotas
- [x] Solicitações: 7 rotas (com paciente inline + acompanhante + criadaPorMim)
- [x] Viagens: 10 rotas (incluindo presença e passageiros)
- [x] Abastecimento: 6 rotas
- [x] Saldo de Frota: 4 rotas (`/saldo`, `/ajustar`, `/aportar`, `/aportes`)
- [x] Saldo de Ajuda de Custo: 4 rotas (`/saldo-ajuda-custo` + 3)
- [x] Ajudas de Custo: 6 rotas (incluindo `GET /:id`; `pagar` é ADMIN/DEV)
- [x] Auditoria: 4 rotas (lista, byId, **verificar**, exportar-tj)
- [x] Relatórios: 1 rota (`/relatorios/especialidades` — v0.10)

### RBAC + Auditoria
- [x] Middleware `requireRole` (matriz §3) — REGULADOR_TFD adicionado
- [x] Multi-tenancy por `prefeituraId` do JWT — 404 em vez de 403
- [x] Hash encadeado SHA-256 com canonicalização RFC 8785 (JCS)
- [x] `GET /auditoria/verificar` (ADMIN/DEV)
- [x] GESTOR_TFD pode criar somente REGULADOR_TFD via `POST /v1/admin/usuarios`

### Idempotência (X-Idempotency-Key, TTL 24h)
- [x] `POST /saldo/aportar`
- [x] `POST /saldo-ajuda-custo/aportar`
- [x] `POST /ajudas-custo/:id/pagar`
- [x] `POST /abastecimentos/:id/comprovante`

### Validações (códigos de erro estáveis)
- [x] CNH vencida ao iniciar/alocar viagem (`422 CNH_VENCIDA`)
- [x] Veículo em manutenção (`422 VEICULO_INDISPONIVEL`)
- [x] Motorista afastado (`422 MOTORISTA_INDISPONIVEL`)
- [x] Capacidade ao alocar (`409 CAPACIDADE_EXCEDIDA` / `422 VAGAS_EXCEDEM_CAPACIDADE`)
- [x] Assento ocupado (`409 ASSENTO_OCUPADO`)
- [x] Saldo de frota insuficiente (`422 SALDO_INSUFICIENTE`)
- [x] Saldo de ajuda insuficiente (`422 SALDO_AJUDA_INSUFICIENTE`)
- [x] Teto de categoria excedido (`422 TETO_CATEGORIA_EXCEDIDO`)
- [x] Hodômetro retroativo (`422 HODOMETRO_INVALIDO`)
- [x] Ajuda duplicada por (viagem, paciente) (`409 AJUDA_DUPLICADA`)
- [x] Comprovante > 105% do estimado (`422 VALOR_EXCEDE_LIMITE`)
- [x] Combustível incompatível (FLEX aceita GASOLINA/ETANOL; demais batem exato)
- [x] Aporte com fonte EMPENHO/PORTARIA sem `numeroDocumento` (`422 APORTE_DOCUMENTO_OBRIGATORIO`)
- [x] Aporte com fonte OUTRO sem `descricaoFonte` (`422 APORTE_FONTE_INVALIDA`)
- [x] Aporte com `valorBRL ≤ 0` (`422 APORTE_INVALIDO`)
- [x] Justificativa < 10 chars (`422 JUSTIFICATIVA_OBRIGATORIA`)
- [x] Motivo de negação < 10 chars (`422 MOTIVO_OBRIGATORIO`)
- [x] Paciente inline + pacienteId conflitam (`400 PACIENTE_E_ID_CONFLITAM`) — v0.10
- [x] Nem paciente nem pacienteId (`400 PACIENTE_OU_ID_OBRIGATORIO`) — v0.10
- [x] `acompanhanteNecessario=true` sem `acompanhante` (`400 ACOMPANHANTE_OBRIGATORIO`) — v0.10
- [x] GESTOR_TFD criando role ≠ REGULADOR_TFD (`422 ROLE_INVALIDA_TFD`) — v0.10
- [x] Janela inválida no relatório (`400 JANELA_INVALIDA`) — v0.10

### Testes integrados (recomendados)
- [ ] Cadeia de hash íntegra após N inserções (`auditoria/verificar` → `corrompidos: []`)
- [ ] Adulteração manual de registro de auditoria → `verificar` detecta
- [ ] Cancelamento de viagem libera solicitações alocadas
- [ ] CONCLUIR viagem soma KM ao motorista e atualiza hodômetro do veículo
- [ ] Comprovante de abastecimento liquida saldo (reservado→consumido)
- [ ] Pagar ajuda de custo liquida saldo de ajuda; negar libera reserva
- [ ] Aporte com `rateioGeral=true` cria N registros com mesmo `grupoRateioId`
- [ ] Re-execução com mesmo `X-Idempotency-Key` devolve mesma resposta (TTL 24h)
- [ ] POST inline com CPF existente faz upsert (mescla campos ausentes)
- [ ] REGULADOR_TFD não consegue acessar `/relatorios/especialidades` (403)
- [ ] Export TJ ZIP é determinístico (hashes do manifest batem entre 2 chamadas)

### Catálogo de erros (v0.10)
Frontend traduz pelo `code` (estável). Catálogo mantido em
`src/lib/api/erros-tfd.ts` (frontend) — backend deve respeitar. Códigos
adicionados em v0.10:

```
PACIENTE_OU_ID_OBRIGATORIO   400  POST /solicitacoes sem paciente nem pacienteId
PACIENTE_E_ID_CONFLITAM      400  POST /solicitacoes com os dois
ACOMPANHANTE_OBRIGATORIO     400  acompanhanteNecessario=true sem acompanhante
ROLE_INVALIDA_TFD            422  GESTOR_TFD criando role ≠ REGULADOR_TFD
JANELA_INVALIDA              400  desde > ate em /relatorios/especialidades
```

### Frontend de referência
Frontend SvelteKit consome todos os contratos via `src/lib/api/client.ts`
→ classe `TfdApi`. Tipos em `src/lib/api/tfd-types.ts`. Catálogo de erros
em `src/lib/api/erros-tfd.ts`.

---

*Documento mantido pelo time de arquitetura UNISISM. DPO: definir.*
