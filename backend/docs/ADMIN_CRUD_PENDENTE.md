# Endpoints Administrativos Pendentes no Backend

> O frontend UNISISM agora expõe UI completa de edit/delete/desativar para
> usuários ADMIN e DESENVOLVEDOR em toda a Face SMS. Alguns dos endpoints
> que a UI consome **ainda não existem no backend** — este documento lista
> o que falta implementar pra fechar o ciclo.
>
> Enquanto não existirem, as chamadas retornarão 404 e a UI mostrará mensagem
> de erro — o botão fica visível mas a ação falha graciosamente.

---

## 1. UBS

### `PATCH /admin/ubs/:id`

Atualização parcial dos dados de uma UBS.

**Request body** (`AtualizarUbsRequest`):
```ts
{
  nome?: string;
  municipio?: string;
  uf?: string;
  endereco?: string | null;
  cnes?: string | null;
  ativa?: boolean;      // se quiser permitir toggle de atividade via PATCH
}
```

**Response (200)**: `Ubs` completo (mesmo shape do `POST /admin/ubs`).

**Error codes esperados pelo frontend:**
- `400 NENHUMA_ALTERACAO` — body vazio ou todos os campos iguais aos atuais
- `403 PERMISSAO_INSUFICIENTE` — role ≠ ADMIN/DESENVOLVEDOR
- `404 UBS_NAO_ENCONTRADA`
- `409 CNES_EM_USO` — CNES colide com outra UBS
- `422 CAMPO_INVALIDO` — ex.: UF não é uma das 27 siglas válidas

**Regras de autorização:**
- `DESENVOLVEDOR` pode editar qualquer UBS.
- `ADMIN` só pode editar UBSs da própria prefeitura (isolation automático).

---

### `DELETE /admin/ubs/:id`

Exclusão lógica (soft delete) ou física da UBS.

**Response (204)**: sem conteúdo.

**Error codes esperados:**
- `403 PERMISSAO_INSUFICIENTE`
- `404 UBS_NAO_ENCONTRADA`
- `409 UBS_TEM_USUARIOS_VINCULADOS` — existem usuários `ubs_id = :id`
- `409 UBS_TEM_ENCAMINHAMENTOS` — existem encaminhamentos vinculados

**Recomendação arquitetural:**
- Se houver qualquer encaminhamento histórico, **não permita exclusão física** — retorne `409 UBS_TEM_ENCAMINHAMENTOS` e force o admin a desativar em vez de excluir. Preserva trilha de auditoria.
- Se a exclusão for aceita, limpe dependências em cascata ou retorne erro claro.

---

### `POST /admin/ubs/:id/ativo`

Ativa ou desativa a UBS (toggle separado do PATCH para ficar simétrico com
`/admin/usuarios/:id/ativo`).

**Request body:**
```ts
{ ativa: boolean }
```

**Response (200):**
```ts
{ id: string; ativa: boolean }
```

**Error codes:**
- `403 PERMISSAO_INSUFICIENTE`
- `404 UBS_NAO_ENCONTRADA`

**Efeitos colaterais desejados:**
- Ao desativar: todos os usuários vinculados deveriam ser forçados a sair das sessões ativas (revoga refresh token).
- Não aceita novos encaminhamentos (middleware do `POST /encaminhamentos` valida `ubs.ativa`).

---

## 2. Prefeitura

### `PATCH /admin/prefeituras/:id`

Atualização parcial de dados de prefeitura.

**Request body** (`AtualizarPrefeituraRequest`):
```ts
{
  nome?: string;
  municipio?: string;
  uf?: string;
  cnpj?: string | null;
  ativa?: boolean;
}
```

**Response (200)**: `Prefeitura` completo.

**Error codes:**
- `400 NENHUMA_ALTERACAO`
- `403 PERMISSAO_INSUFICIENTE` — só DESENVOLVEDOR
- `404 PREFEITURA_NAO_ENCONTRADA`
- `409 CNPJ_EM_USO`

**Regras de autorização:**
- **Apenas `DESENVOLVEDOR`** pode editar prefeituras (cliente institucional). `ADMIN` fica restrito a UBSs e usuários dentro da própria prefeitura.

---

### `DELETE /admin/prefeituras/:id`

**Response (204)**.

**Error codes:**
- `403 PERMISSAO_INSUFICIENTE` — só DESENVOLVEDOR
- `404 PREFEITURA_NAO_ENCONTRADA`
- `409 PREFEITURA_TEM_UBS_VINCULADAS`
- `409 PREFEITURA_TEM_USUARIOS`

**Recomendação:** exclusão física só se todos os vínculos estiverem ausentes (cascade não é seguro em B2G — deixa pro admin migrar manualmente).

---

## 3. Resumo da tabela de permissões esperada

| Recurso     | Edit (PATCH)                        | Delete (DELETE)        | Toggle Ativo            |
|-------------|-------------------------------------|------------------------|-------------------------|
| Usuário     | ✅ implementado (ADMIN/DEV)          | ✅ implementado        | ✅ implementado         |
| UBS         | ❌ **PATCH /admin/ubs/:id**          | ❌ **DELETE**          | ❌ **POST .../ativo**   |
| Prefeitura  | ❌ **PATCH** (só DEV)                | ❌ **DELETE** (só DEV) | via PATCH (`ativa`)     |

---

## 4. Auditoria (aplicar a tudo)

Toda operação de edit/delete/desativar deve gerar linha em `admin_audit_log`:

```sql
CREATE TABLE admin_audit_log (
  id           bigserial PRIMARY KEY,
  operador_id  uuid NOT NULL REFERENCES usuario(id),
  acao         text NOT NULL,        -- UPDATE | DELETE | SET_ATIVO | RESET_SENHA
  recurso      text NOT NULL,        -- USUARIO | UBS | PREFEITURA
  recurso_id   uuid NOT NULL,
  antes        jsonb,                -- snapshot pré-mudança
  depois       jsonb,                -- snapshot pós-mudança
  ip           inet,
  user_agent   text,
  em           timestamptz NOT NULL DEFAULT now()
);
```

Retenção: **5 anos** (alinhado ao guia de relatórios e LGPD art. 37).

---

## 5. Frontend já está pronto

Do lado do cliente, já existe:

- **`AdminApi.updateUbs(id, req)`** · `src/lib/api/client.ts`
- **`AdminApi.deleteUbs(id)`**
- **`AdminApi.setAtivoUbs(id, ativa)`**
- **`AdminApi.updatePrefeitura(id, req)`**
- **`AdminApi.deletePrefeitura(id)`**

Tipos definidos em `src/lib/api/types.ts`:
- `AtualizarUbsRequest`
- `AtualizarPrefeituraRequest`

**Quando o backend subir esses endpoints, nenhuma mudança no frontend é necessária.**

---

## 6. Checklist backend

- [ ] Migration `admin_audit_log` + trigger genérico
- [ ] `PATCH /admin/ubs/:id` + testes (isolation por prefeitura, CNES collision)
- [ ] `DELETE /admin/ubs/:id` + guard de vínculos
- [ ] `POST /admin/ubs/:id/ativo` + revoga sessões dos vinculados
- [ ] `PATCH /admin/prefeituras/:id` (só DEV)
- [ ] `DELETE /admin/prefeituras/:id` (só DEV)
- [ ] Rate limit: máx 60 operações admin/hora por operador
- [ ] Teste integrado: ADMIN tenta editar UBS de outra prefeitura → 404 (nunca 403)

*Última atualização: 2026-04-24 · Frontend versão: pós-v0.6.0.*
