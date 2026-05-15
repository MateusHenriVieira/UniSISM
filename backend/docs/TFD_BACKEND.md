# UNISISM · Face 4 (TFD) — Guia de implementação do backend

> Companion técnico do `TFD_API.md` (contrato HTTP). Este doc descreve **como
> o backend está implementado**: onde os arquivos vivem, o que cada middleware
> faz, como rodar em dev, como reconstruir a cadeia de auditoria e o que mudou
> na v0.9.
>
> **Versão:** v0.9.0 · **Última atualização:** 2026-04-27

---

## 1. O que mudou na v0.9 (alinhamento com a spec do frontend)

A spec do frontend pede 3 capacidades que o backend não tinha:

| Gap                                              | Status v0.8 | Status v0.9 |
|--------------------------------------------------|:-----------:|:-----------:|
| Aporte de saldo de combustível (≠ ajuste)        | ❌          | ✅           |
| Saldo de Ajuda de Custo (orçamento global + tetos)| ❌          | ✅           |
| Reserva/liquidação de saldo na ajuda de custo    | ❌          | ✅           |
| Validação de teto por categoria nos itens de ajuda| ❌          | ✅           |
| Compatibilidade combustível FLEX                 | ❌          | ✅           |
| Idempotência (`X-Idempotency-Key`)                | ❌          | ✅           |
| Hash-chain canonical (RFC 8785)                  | ⚠️ stringify| ✅           |

Todos os endpoints e regras já documentados em `TFD_API.md` continuam
válidos. As 8 novas rotas estão na §3 abaixo.

---

## 2. Mapa de arquivos

```
src/modules/tfd/
├── application/
│   ├── _helpers.ts                    Multi-tenancy, prefeituraId, protocolos
│   ├── veiculos.ts                    CRUD frota
│   ├── motoristas.ts                  CRUD motoristas + cnhVencidaEm
│   ├── solicitacoes.ts                Solicitações TFD + aprovar+alocar atômico
│   ├── viagens.ts                     Viagens + passageiros (assentos)
│   ├── abastecimentos.ts              Abastecimento + reserva/liquidação saldo
│   │                                  + validação FLEX (v0.9)
│   ├── saldo.ts                       Saldo de Frota + AJUSTAR + APORTAR (v0.9)
│   ├── saldo-ajuda-custo.ts           Saldo Ajuda Custo CRUD completo (v0.9)
│   ├── ajudas-custo.ts                Ajudas + tetos + reserva/liquidação (v0.9)
│   └── auditoria.ts                   Listar, verificar, exportar TJ (ZIP)
├── infrastructure/
│   ├── TfdAuditLogger.ts              Hash-chain SHA-256 + canonicalJson (v0.9)
│   ├── TfdSignatureService.ts         Assinatura ICP-Brasil opcional do ZIP TJ
│   └── SaldoMensalCron.ts             Cron mensal: cria placeholders de saldo
└── presentation/
    ├── schemas.ts                     Zod schemas (request validation)
    ├── TfdController.ts               55 handlers HTTP
    └── tfd.routes.ts                  Roteamento + RBAC + idempotência

src/shared/
└── canonicalJson.ts                   RFC 8785 — JCS (v0.9)

src/presentation/middlewares/
└── idempotency.ts                     X-Idempotency-Key TTL 24h (v0.9)

scripts/
└── rebuild-tfd-audit-chain.ts         Recompila cadeia para algoritmo novo (v0.9)
```

---

## 3. Endpoints novos da v0.9

> RBAC: `gestor` = `GESTOR_TFD | ADMIN | DEV`; `admin` = `ADMIN | DEV` apenas.

### 3.1. Aporte de Saldo de Frota

```
POST /v1/tfd/saldo/aportar         RBAC: gestor   Idempotent: ✓
GET  /v1/tfd/saldo/aportes         RBAC: gestor
```

Corpo (modo veículo único):

```json
{
  "veiculoId": "uuid",
  "mes": "2026-04",
  "valorBRL": 5000.00,
  "fonte": "EMPENHO",
  "numeroDocumento": "2026NE000123",
  "justificativa": "aporte mensal regular para combustível"
}
```

Corpo (modo rateio entre veículos ATIVO):

```json
{
  "rateioGeral": true,
  "mes": "2026-04",
  "valorBRL": 15000.00,
  "fonte": "REPASSE_FEDERAL",
  "numeroDocumento": "FNS-2026-99",
  "justificativa": "rateio do repasse federal abril/2026"
}
```

- `valorBRL` é convertido pra centavos, dividido entre N veículos `ATIVO`,
  resto adicionado ao primeiro (ordem alfabética por placa).
- Cria N registros em `tfd_saldo_frota_aportes` no mesmo `grupoRateioId`.
- Auditoria: 1 evento `SALDO_APORTADO` com `recursoId = grupoRateioId`.

### 3.2. Saldo de Ajuda de Custo

```
GET  /v1/tfd/saldo-ajuda-custo                RBAC: gestor
POST /v1/tfd/saldo-ajuda-custo/ajustar        RBAC: admin
POST /v1/tfd/saldo-ajuda-custo/aportar        RBAC: gestor   Idempotent: ✓
GET  /v1/tfd/saldo-ajuda-custo/aportes        RBAC: gestor
```

`GET` (placeholder zeros se não houver registro):

```json
{
  "prefeituraId": "uuid",
  "mes": "2026-04",
  "saldoMensal": 25000,
  "saldoConsumido": 8400,
  "saldoReservado": 1200,
  "saldoDisponivel": 15400,
  "tetoAlimentacao": 80,
  "tetoHospedagem": 250,
  "tetoDeslocamento": 60,
  "atualizadoEm": "2026-04-25T14:30:00.000Z"
}
```

`POST /ajustar` (sobrescreve mensal e tetos — restrito a ADMIN/DEV):

```json
{
  "mes": "2026-04",
  "novoSaldoMensal": 25000,
  "tetoAlimentacao": 80,
  "tetoHospedagem": 250,
  "tetoDeslocamento": 60,
  "justificativa": "revisão dos tetos conforme Portaria SMS 047/2026"
}
```

- Tetos `0` = sem teto.
- Cria registro em `tfd_saldo_ajuda_ajustes` (snapshot antes/depois) e
  audita `SALDO_AJUDA_AJUSTADO`.

`POST /aportar`:

```json
{
  "mes": "2026-04",
  "valorBRL": 10000,
  "fonte": "REPASSE_FEDERAL",
  "numeroDocumento": "FNS-2026-12345",
  "justificativa": "repasse FNS componente TFD abril/2026"
}
```

- SOMA `valorBRL` em `SaldoAjudaCusto.saldoMensal`.
- Auditoria: `SALDO_AJUDA_APORTADO`.

### 3.3. Ajuda de Custo — agora com saldo + tetos

Mudanças (mesma URL, mesmo verbo):

| Verbo                               | Mudança                                                                  |
|-------------------------------------|---------------------------------------------------------------------------|
| `POST /tfd/ajudas-custo`            | Valida `paciente alocado na viagem`, `teto por categoria`, `saldo disponível`. Reserva `valorTotal`. |
| `POST /tfd/ajudas-custo/:id/negar`  | Libera reserva.                                                          |
| `POST /tfd/ajudas-custo/:id/pagar`  | Libera reserva e debita em `saldoConsumido`.                             |

Novos códigos de erro:

- `SALDO_AJUDA_INSUFICIENTE` (422)
- `TETO_CATEGORIA_EXCEDIDO` (422)
- `APORTE_INVALIDO` (422)
- `APORTE_DOCUMENTO_OBRIGATORIO` (422)
- `APORTE_FONTE_INVALIDA` (422)

---

## 4. Hash-chain (RFC 8785)

### 4.1. Algoritmo

Para cada registro inserido em `tfd_audit_log`:

```
hash = SHA-256( canonicalJson({
  acao, antes, depois, em (ISO), hashAnterior,
  id, ip, operadorId, recursoId
}) )
```

`canonicalJson` (em `src/shared/canonicalJson.ts`) implementa **RFC 8785**:

- Chaves de objeto ordenadas em UTF-16 lexicográfico.
- Strings com escape mínimo (`"`, `\`, controles, sem espaços supérfluos).
- Números: representação ECMAScript (`-0` → `0`).
- `BigInt`/`NaN`/`Infinity` → erro (não são JSON canônico).
- `undefined` em objeto → chave omitida; em array → `null`.

> **Por quê:** `JSON.stringify` não garante ordem de chaves; o mesmo objeto
> serializado em duas execuções podia gerar bytes diferentes, quebrando
> `verificar` em produção. Com JCS, mesmo input ⇒ mesmos bytes ⇒ mesmo hash.

### 4.2. Genesis e cadeia

- Primeiro registro de cada prefeitura: `hashAnterior = '0' x 64`.
- Cada novo registro lê o `hash` mais recente da prefeitura (FOR UPDATE
  no Postgres via Prisma transaction) → vira o `hashAnterior` do próximo.

### 4.3. Verificar integridade

```
GET /v1/tfd/auditoria/verificar?prefeituraId=...   RBAC: DESENVOLVEDOR
```

Resposta:

```json
{ "total": 1234, "corrompidos": [] }
```

`corrompidos` lista os IDs que falharam (hash recalculado ≠ armazenado, ou
`hashAnterior` ≠ `hash` do registro anterior).

### 4.4. Rebuild (migração v0.8 → v0.9)

```bash
npm run tfd:rebuild-audit-chain
```

O script (`scripts/rebuild-tfd-audit-chain.ts`):

1. Busca todas as prefeituras com registros de auditoria.
2. Para cada uma, percorre em ordem cronológica (`em ASC`).
3. Recomputa `hash`/`hashAnterior` com o algoritmo novo (RFC 8785).
4. Atualiza só os registros que diferem; mostra contagem.

> Em produção: rodar uma única vez na janela de manutenção. **Faça backup
> da tabela antes** — o script é idempotente (rodar de novo é no-op), mas
> backup permite forense se preciso comparar com o estado v0.8.

---

## 5. Idempotência (`X-Idempotency-Key`)

### 5.1. Como funciona

Middleware `src/presentation/middlewares/idempotency.ts`:

1. Lê o header `X-Idempotency-Key` (qualquer string opaca, ≤ ~200 chars).
2. Calcula `hash = SHA-256(operadorId | key | method | path)`.
3. Se já existe registro em `tfd_idempotency_keys` não expirado:
   - Replica o status + JSON cacheado.
4. Caso contrário, instrumenta `res.json` para gravar o resultado **se
   2xx** (TTL 24h).

### 5.2. Onde está aplicado

| Endpoint                                          | Por quê                          |
|---------------------------------------------------|----------------------------------|
| `POST /tfd/saldo/aportar`                         | Evita aporte duplo               |
| `POST /tfd/saldo-ajuda-custo/aportar`             | Evita aporte duplo               |
| `POST /tfd/ajudas-custo/:id/pagar`                | Evita pagamento duplo            |
| `POST /tfd/abastecimentos/:id/comprovante`        | Evita débito duplo no saldo      |

### 5.3. Limites

- Só intercepta `res.json(...)`. Endpoints binários (download de comprovante)
  não cacheiam — não faz sentido.
- Garbage collection lazy: a cada 5min, a primeira request com
  `X-Idempotency-Key` apaga registros expirados (`expiraEm < now`).
- A chave por operador evita colisão entre usuários distintos com mesma key.

### 5.4. Tabela

```sql
CREATE TABLE tfd_idempotency_keys (
  hash         TEXT PRIMARY KEY,    -- sha256(op|key|method|path)
  operadorId   TEXT NOT NULL,
  method       TEXT NOT NULL,
  path         TEXT NOT NULL,
  statusCode   INT  NOT NULL,
  responseJson JSONB NOT NULL,
  criadoEm     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiraEm     TIMESTAMPTZ NOT NULL
);
```

---

## 6. Combustível compatível (FLEX)

Em `POST /tfd/abastecimentos`:

| Veículo `combustivel` | Aceita no abastecimento  | Caso contrário        |
|-----------------------|--------------------------|-----------------------|
| `FLEX`                | `GASOLINA` ou `ETANOL`   | `PAYLOAD_INVALIDO`    |
| `DIESEL` / `GASOLINA` / `ETANOL` / `GNV` / `ELETRICO` | exato | `PAYLOAD_INVALIDO`    |

Resposta de erro inclui `details: { veiculoCombustivel, recebido }`.

---

## 7. Reserva contábil — invariante

Para `SaldoVeiculo` E `SaldoAjudaCusto`:

```
saldoDisponivel = saldoMensal - saldoConsumido - saldoReservado
saldoDisponivel ≥ 0  (sempre)
```

Transições garantidas em transação atômica:

| Operação                   | Efeito no saldo                                     |
|----------------------------|-----------------------------------------------------|
| `aportar`                  | `saldoMensal += valor`                              |
| `ajustar`                  | `saldoMensal = novo`                                |
| Abast. `solicitar`         | sem efeito (pré-validação)                          |
| Abast. `liberar`           | `saldoReservado += valorEstimado` (verifica disponível antes) |
| Abast. `negar`             | `saldoReservado -= valorEstimado` (se LIBERADO)     |
| Abast. `comprovante`       | `saldoReservado -= valorEstimado`; `saldoConsumido += valorTotal` |
| Ajuda `solicitar`          | `saldoReservado += valorTotal` (verifica disponível e teto/cat)  |
| Ajuda `negar`              | `saldoReservado -= valorTotal`                      |
| Ajuda `pagar`              | `saldoReservado -= valorTotal`; `saldoConsumido += valorTotal`   |

---

## 8. Como rodar (dev)

```bash
# Dependências (Postgres, Redis, MinIO, ClamAV)
docker compose up -d postgres redis minio clamav

# Migrações + Prisma client
npx prisma migrate deploy
npx prisma generate

# Bucket MinIO (uma vez)
npm run minio:init

# Seed (cria DESENVOLVEDOR · matrícula DEV-MATEUS · senha Aguasbelas#!)
npm run db:seed

# Backend
npm run dev          # http://localhost:3333/v1
```

Para reconstruir a cadeia de auditoria (uma vez, ao subir v0.9):

```bash
npm run tfd:rebuild-audit-chain
```

---

## 9. Smoke test rápido (curl)

```bash
TOKEN=$(curl -s http://localhost:3333/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"DEV-MATEUS","senha":"Aguasbelas#!"}' | jq -r .token)
PREF="<uuid-da-prefeitura>"

# Saldo de ajuda de custo (mês atual, placeholder)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/v1/tfd/saldo-ajuda-custo?prefeituraId=$PREF" | jq

# Aportar (com idempotência)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Idempotency-Key: meu-aporte-001' \
  "http://localhost:3333/v1/tfd/saldo-ajuda-custo/aportar?prefeituraId=$PREF" \
  -d '{"mes":"2026-04","valorBRL":15000,"fonte":"REPASSE_FEDERAL",
       "numeroDocumento":"FNS-2026-00099",
       "justificativa":"repasse FNS componente TFD abril/2026"}' | jq

# Verificar cadeia
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3333/v1/tfd/auditoria/verificar?prefeituraId=$PREF" | jq
# → { "total": N, "corrompidos": [] }
```

---

## 10. Catálogo de erros novos (v0.9)

| Code                            | HTTP | Quando dispara                                                  |
|---------------------------------|:----:|------------------------------------------------------------------|
| `SALDO_AJUDA_INSUFICIENTE`      | 422  | `solicitar` ajuda excede saldo disponível do mês.                |
| `TETO_CATEGORIA_EXCEDIDO`       | 422  | Item da ajuda excede teto da categoria (≠ 0).                    |
| `APORTE_INVALIDO`               | 422  | `valorBRL ≤ 0` ou rateio sem veículos ATIVO ou ambos veiculoId+rateio. |
| `APORTE_DOCUMENTO_OBRIGATORIO`  | 422  | Fonte `EMPENHO`/`PORTARIA` sem `numeroDocumento`.                |
| `APORTE_FONTE_INVALIDA`         | 422  | Fonte `OUTRO` sem `descricaoFonte`.                              |
| `PAYLOAD_INVALIDO` (combustível)| 400  | Combustível incompatível com veículo (FLEX≠gas/etanol; demais não exatos). |

Os demais (`SALDO_INSUFICIENTE`, `VALOR_EXCEDE_LIMITE`, `HODOMETRO_INVALIDO`,
`AJUDA_DUPLICADA`, etc.) continuam iguais ao `TFD_API.md`.

---

## 11. Referências

- `TFD_API.md` — contrato HTTP completo (continua a fonte canônica).
- `prisma/schema.prisma` — todos os models.
- `prisma/migrations/20260427135919_tfd_aportes_saldo_ajuda_idempotencia/` — migration v0.9.
- `src/shared/canonicalJson.ts` — implementação RFC 8785 (~80 LOC).
