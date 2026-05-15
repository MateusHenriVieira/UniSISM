# Face 4 (TFD) · Production-Grade Setup

> Detalhes de operação dos 3 mecanismos production-grade da Face 4:
>
> 1. **Triggers SQL de imutabilidade** dos audit logs
> 2. **Cron mensal de saldos** por veículo
> 3. **Assinatura digital ICP-Brasil** do export TJ
>
> Este doc é para o time de DevOps/SRE — não para o frontend. O frontend
> consome os mesmos 47 endpoints documentados em `TFD_API.md`.

---

## 1. Triggers SQL de imutabilidade

### O que faz

Cria triggers `BEFORE UPDATE / DELETE / TRUNCATE` em:
- `tfd_audit_log` (cadeia hash TJ)
- `paciente_prontuario_audit` (Res. CFM 1.821/2007)

Qualquer tentativa de modificar uma linha desses logs gera `ERROR: audit log é imutável (LGPD/CFM/TJ)` no banco — defesa em profundidade que vai além do código da aplicação.

### Como aplicar

**Automático** — todo boot do servidor roda `aplicarTriggersImutabilidade()` antes do app subir. Idempotente: usa `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`.

**Manual** (em CI/CD ou após `prisma migrate deploy`):
```bash
npm run db:setup-triggers
```

### Validação no boot

```ts
const trig = await checarTriggersAtivos();
// { tfdAuditOk: true, prontuarioAuditOk: true }
```

Em **produção** (`NODE_ENV=production`), se algum trigger não está ativo após o bootstrap, o servidor **falha o boot** (process.exit(1)). Em dev, apenas loga warning.

### Arquivo SQL

`prisma/sql/tfd-audit-triggers.sql` — versionado, auditável. O bootstrap lê esse arquivo e roda statement por statement (split que respeita `$$ ... $$` do PL/pgSQL).

### Como remover triggers (apenas DEV/manutenção autorizada)

```sql
DROP TRIGGER tfd_audit_no_update ON tfd_audit_log;
DROP TRIGGER tfd_audit_no_delete ON tfd_audit_log;
DROP TRIGGER tfd_audit_no_truncate ON tfd_audit_log;
DROP TRIGGER prontuario_audit_no_update ON paciente_prontuario_audit;
DROP TRIGGER prontuario_audit_no_delete ON paciente_prontuario_audit;
DROP TRIGGER prontuario_audit_no_truncate ON paciente_prontuario_audit;
DROP FUNCTION audit_log_immutable;
```

> ⚠️ Em produção isso só deve ser feito durante migrations destrutivas planejadas (ex.: archive de logs antigos pra cold storage). Sempre auditar manualmente o operador.

---

## 2. Cron mensal de saldos

### O que faz

Para cada veículo `ATIVO` de toda prefeitura:
- Se já existe `SaldoVeiculo` do mês corrente → **ignora**
- Se há `SaldoVeiculo` do mês anterior → **copia o `saldoMensal`** (zera `saldoConsumido` e `saldoReservado`)
- Caso contrário → cria com saldo zero (gestor ajusta depois via `POST /v1/tfd/saldo/ajustar`)

### Quando roda

| Momento | Comportamento |
|---|---|
| **Boot do servidor** | Sweep de catch-up imediato (não bloqueia startup — fire-and-forget). Garante consistência mesmo se o servidor estava down dia 1º. |
| **Cron** | `30 0 1 * *` (UTC) — dia 1º de cada mês às 00:30 UTC |

### Configuração (env vars)

```bash
TFD_SALDO_CRON='30 0 1 * *'   # cron expression (default: dia 1º 00:30)
TFD_SALDO_CRON_TZ='UTC'       # timezone (default: UTC)
```

Se a expressão for inválida, o cron **NÃO** ativa e loga `error`. O catch-up no boot continua acontecendo normalmente — só perde a recorrência mensal automatizada.

### Logs e observabilidade

Cada execução loga sumário:
```json
{
  "mes": "2026-05",
  "totalVeiculosAtivos": 12,
  "criados": 8,
  "jaExistiam": 4,
  "falhados": 0,
  "origem": "cron",            // ou "boot-catchup"
  "duracaoMs": 142
}
```

### Para chamada manual (debug)

```ts
import { sweepSaldosMensais } from './src/modules/tfd/infrastructure/SaldoMensalCron';
const r = await sweepSaldosMensais('2026-05'); // mes opcional, default = corrente
```

### Idempotência garantida

Pode rodar N vezes no mesmo mês — cada chamada incrementa apenas `criados` se houver veículo novo. Veículos já com saldo do mês ficam intocados.

---

## 3. Assinatura digital ICP-Brasil

### O que faz

Quando o gestor chama `GET /v1/tfd/auditoria/exportar-tj?mes=YYYY-MM`, o backend:

1. Gera os 5 CSVs determinísticos
2. Concatena os CSVs em ordem fixa → `conteudoAssinavel` (Buffer)
3. Calcula `SHA-256(conteudoAssinavel)`
4. Se cert ICP-Brasil disponível → assina com **PKCS#7 detached** (CMS, RFC 5652)
5. Adiciona `assinatura.p7s` + `cert.pem` ao ZIP final
6. Manifest declara o modo (`ICP_BRASIL` ou `HASH_ONLY`)

### Configuração (env vars)

```bash
TFD_SIGN_CERT_PATH=/etc/unisism/cert.pfx
TFD_SIGN_CERT_PASSWORD=senha-do-pkcs12
TFD_SIGN_REQUIRED=true   # opcional: fail-fast no boot se cert ausente
```

### Modos

| Modo | Quando ativa | Manifest | Headers HTTP |
|---|---|---|---|
| `ICP_BRASIL` | cert válido configurado | inclui `certSubject`, `certValidoAte`, `arquivosAssinatura` | `X-Modo-Assinatura: ICP_BRASIL`, `X-Cert-Subject: ...` |
| `HASH_ONLY` | cert ausente, expirado ou parser falhou | inclui aviso explícito | `X-Modo-Assinatura: HASH_ONLY` |

Em **produção**, recomenda-se `TFD_SIGN_REQUIRED=true` — se cert não está disponível ao boot, o servidor falha imediatamente (fail-fast).

### Por que PKCS#7 detached e não embutido?

1. **ZIP continua válido** como ZIP — abre em qualquer ferramenta sem precisar do cert.
2. **Verificador externo** (TJ, TCM) só precisa do `.p7s` + conteúdo binário — padrão de processo eletrônico Brasil.
3. **Compatível com PJe / e-SAJ** (sistemas judiciais).

### Cadeia de validação (TJ)

O TJ valida usando:
1. **Hash SHA-256** do conteúdo (`X-Sha256-Conteudo` header + `manifest.sha256Conteudo`)
2. **`assinatura.p7s`** com [assinador.iti.gov.br](https://assinador.iti.gov.br/) ou ferramenta interna
3. **CRL/OCSP** do cert (validade revogada?) — feito externamente, não no backend

O endpoint `verificarAssinaturaTj()` no service confirma:
- Parse OK do PKCS#7
- Cert dentro do período de validade

Mas a verificação criptográfica completa (cadeia até a AC raiz, CRL) é responsabilidade da ferramenta oficial do ITI/TJ.

### Como obter um cert ICP-Brasil real

Para a Prefeitura de Águas Belas (e outras municípios):
- **e-CNPJ A1** (em arquivo .pfx) — pode ser emitido pelas ACs habilitadas (Serpro, Certisign, Soluti, etc.)
- Custo aproximado: R$ 200–400 / ano
- Renovação anual obrigatória — backend valida `notAfter` e desliga signing quando expira

### Como gerar cert self-signed pra testes (dev/staging)

```bash
# Usando openssl
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=PREFEITURA-DEV/O=ICP-BRASIL-MOCK/C=BR"
openssl pkcs12 -export -out cert.pfx -inkey key.pem -in cert.pem -password pass:senha-dev

# Ou via node-forge (script JS) — ver /tmp/test-prod-features.js
```

> ⚠️ Cert self-signed **NÃO é válido legalmente** — usar apenas pra testar pipeline. Em produção exige cert ICP-Brasil real.

### Verificação manual de uma assinatura gerada

```bash
# Extrai do ZIP
unzip tfd-AAAA-2026-04.zip -d /tmp/tj
cd /tmp/tj

# Valida com openssl
openssl smime -verify -binary \
  -in assinatura.p7s -inform DER \
  -content <(cat auditoria.csv viagens.csv abastecimentos.csv ajudas-custo.csv saldo-mensal.csv) \
  -CAfile cert.pem -noverify
# → "Verification successful"
```

> Em produção real, substituir `-CAfile cert.pem -noverify` por `-CApath /etc/ssl/icp-brasil/` apontando para a cadeia ICP-Brasil oficial.

---

## Healthcheck completo (production-grade)

Endpoint sugerido (não implementado — roadmap):

```
GET /v1/tfd/health
{
  "triggers": { "tfdAuditOk": true, "prontuarioAuditOk": true },
  "cronSaldos": { "ativo": true, "proximaExecucao": "2026-05-01T00:30:00Z" },
  "assinatura": { "modo": "ICP_BRASIL", "certValidoAte": "2027-04-25T..." }
}
```

Por enquanto, validar no boot via logs:
```bash
grep -E "trigger|Cron|ICP|assinatura|backend escutando" backend.log
```

Saída esperada em produção:
```
✓ triggers de imutabilidade de audit aplicados
✓ cron mensal de saldos TFD iniciado
✓ certificado ICP-Brasil carregado para assinatura TFD
UNISISM · UBS backend escutando
sweep de saldos TFD (boot-catchup) concluído
```

Se algum desses **não** aparece (ou aparece como `WARN/ERROR`), abrir incidente.

---

## Checklist de promoção pra produção

- [ ] `npm run db:setup-triggers` rodou no banco de produção (idempotente, mas explícito é melhor)
- [ ] `TFD_SALDO_CRON_TZ` ajustado pro timezone da operação (ex.: `America/Sao_Paulo`)
- [ ] `TFD_SIGN_CERT_PATH` apontando pra cert .pfx em volume seguro (não no repo)
- [ ] `TFD_SIGN_CERT_PASSWORD` em secret manager (Vault, AWS Secrets, etc.)
- [ ] `TFD_SIGN_REQUIRED=true` para garantir fail-fast
- [ ] Monitoring/alerting em `audit_log_immutable` exception (qualquer tentativa de UPDATE/DELETE = sinal de invasão)
- [ ] Cert ICP-Brasil renovado 30 dias antes do `notAfter` (cron de aviso interno)
- [ ] Backup do banco inclui `tfd_audit_log` e `paciente_prontuario_audit` (point-in-time recovery)
- [ ] Retenção 20 anos configurada no backup (Res. CFM + LRF)

---

## Arquivos do backend

```
backend/
├── prisma/
│   └── sql/tfd-audit-triggers.sql              [novo · idempotente]
├── scripts/
│   └── setup-db-triggers.ts                    [novo · npm run db:setup-triggers]
├── src/
│   ├── main/
│   │   ├── server.ts                           [bootstrap dos 3 mecanismos]
│   │   └── bootstrapTriggers.ts                [novo · aplicar + verificar]
│   └── modules/tfd/infrastructure/
│       ├── SaldoMensalCron.ts                  [novo · node-cron + sweep]
│       └── TfdSignatureService.ts              [novo · node-forge PKCS#7]
└── package.json                                [+ node-cron, node-forge, db:setup-triggers]
```

---

*Última atualização: 2026-04-25 · Versão da Face 4: v0.8.1 (production-ready)*
