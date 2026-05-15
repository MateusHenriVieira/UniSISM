# TFD · Guia do Frontend

> Documentação prática para integrar o frontend SvelteKit com o módulo TFD
> (Face 4 — Tratamento Fora do Domicílio).
>
> Cobre os **47 endpoints** + as melhorias UX (BlaBlaCar style: criar viagem
> por placa, abastecimento por valor direto, escolha de assento).
>
> **Companion docs**:
> - [`TFD_API.md`](./TFD_API.md) — spec arquitetural completa
> - [`PRODUCAO_TFD.md`](./PRODUCAO_TFD.md) — DevOps (triggers SQL, cron, ICP-Brasil)

**Versão:** v0.8.2 · **Backend:** `http://localhost:3333/v1/tfd`

---

## Índice

1. [Setup rápido](#1-setup-rápido)
2. [Autenticação e escopo](#2-autenticação-e-escopo)
3. [Tipos TypeScript](#3-tipos-typescript)
4. [Endpoints por agrupamento](#4-endpoints-por-agrupamento)
5. [Jornadas (fluxos ponta-a-ponta)](#5-jornadas)
6. [Códigos de erro catalogados](#6-códigos-de-erro)
7. [Cliente `TfdApi` pronto pra copiar](#7-cliente-tfdapi)
8. [Padrões de UX recomendados](#8-padrões-de-ux)

---

## 1. Setup rápido

### Variáveis do frontend

```ts
// .env
PUBLIC_API_BASE_URL=http://localhost:3333/v1
```

### Substituir o mock

O arquivo `src/lib/api/tfd-mock.ts` deve ser **removido** quando o backend subir. Substitua o import:

```ts
// ANTES
import { tfdMock } from '$lib/api/tfd-mock';

// DEPOIS
import { api } from '$lib/api/client';
// agora use api.tfd.veiculos.list(), api.tfd.viagens.criar(), etc.
```

A classe `TfdApi` está pronta abaixo (§7) — basta colar em `client.ts`.

---

## 2. Autenticação e escopo

Todos os endpoints exigem `Authorization: Bearer <jwt>` (mesmo JWT da Face 1/2).

### Roles que usam o módulo

| Role | O que pode fazer |
|------|------------------|
| `DESENVOLVEDOR` | tudo, em qualquer prefeitura (precisa passar `?prefeituraId=...` em listagens) |
| `ADMIN` | tudo na sua prefeitura, incluindo ajuste de saldo, exportar TJ, deletar veículo |
| `GESTOR_TFD` | operação dia-a-dia: veículos, motoristas, viagens, abastecimento, ajuda de custo |
| `COORDENADOR_UBS` / `ATENDENTE_UBS` | apenas **criar solicitação TFD** (a UBS pede TFD; SMS aprova) |
| `REGULADOR_SMS` | sem acesso |

### Padrão DEV: passar `prefeituraId`

Como DEV (escopo `GLOBAL`) não tem prefeitura vinculada, ele precisa informar em **todas as escritas e listagens**:

```ts
GET  /v1/tfd/veiculos?prefeituraId=<uuid>
POST /v1/tfd/viagens?prefeituraId=<uuid>   // OU no body: { prefeituraId: "<uuid>", ... }
```

Demais roles herdam do JWT e o `?prefeituraId=` é ignorado.

### Isolation

Tentar acessar recurso de outra prefeitura → **404 RECURSO_NAO_ENCONTRADO** (não 403, pra não vazar existência). Frontend trata como "não existe".

---

## 3. Tipos TypeScript

Cole esses tipos em `src/lib/api/tfd-types.ts`:

```ts
// ============================================================
// FACE 4 · TFD — Tipos compartilhados frontend ↔ backend
// ============================================================

// ---------- Frota (Veículos) ----------
export type TipoVeiculo = 'VAN' | 'ONIBUS' | 'CARRO' | 'AMBULANCIA';
export type StatusVeiculo = 'ATIVO' | 'EM_MANUTENCAO' | 'INATIVO';
export type Combustivel =
  | 'DIESEL' | 'GASOLINA' | 'ETANOL' | 'FLEX' | 'GNV' | 'ELETRICO';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: TipoVeiculo;
  capacidade: number;
  ano: number;
  combustivel: Combustivel;
  consumoMedioKml: number;
  hodometroAtualKm: number;
  proximaRevisaoKm: number | null;
  proximaRevisaoEm: string | null;   // YYYY-MM-DD
  status: StatusVeiculo;
  prefeituraId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarVeiculoRequest {
  placa: string;
  modelo: string;
  tipo: TipoVeiculo;
  capacidade: number;
  ano: number;
  combustivel: Combustivel;
  consumoMedioKml: number;
  hodometroAtualKm?: number;
  proximaRevisaoKm?: number | null;
  proximaRevisaoEm?: string | null;
  prefeituraId?: string;
}
export type AtualizarVeiculoRequest = Partial<CriarVeiculoRequest> & {
  status?: StatusVeiculo;
};

// ---------- Motoristas ----------
export type CategoriaCNH = 'B' | 'C' | 'D' | 'E';
export type StatusMotorista = 'ATIVO' | 'AFASTADO' | 'INATIVO';

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;             // só dígitos
  cnh: string;
  categoriaCnh: CategoriaCNH;
  validadeCnh: string;     // YYYY-MM-DD
  telefone: string;
  status: StatusMotorista;
  totalViagens: number;
  totalKmRodados: number;
  /** Dias até CNH vencer. Negativo = já vencida. */
  cnhVencidaEm: number;
  prefeituraId: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarMotoristaRequest {
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCnh: CategoriaCNH;
  validadeCnh: string;
  telefone: string;
  prefeituraId?: string;
}
export type AtualizarMotoristaRequest = Partial<CriarMotoristaRequest> & {
  status?: StatusMotorista;
};

// ---------- Solicitações TFD ----------
export type StatusSolicitacaoTFD =
  | 'PENDENTE' | 'APROVADA' | 'ALOCADA' | 'REALIZADA' | 'NEGADA' | 'CANCELADA';
export type PrioridadeTFD = 'ELETIVA' | 'PRIORITARIA' | 'URGENTE';
export type TipoAnexoSolicitacaoTFD =
  | 'COMPROVANTE_ENCAMINHAMENTO' | 'EXAME' | 'LAUDO' | 'OUTRO';
export type StatusScanAnexo = 'PENDENTE' | 'LIMPO' | 'INFECTADO' | 'FALHOU';

export interface AnexoSolicitacaoTFD {
  id: string;
  nome: string;
  tipo: TipoAnexoSolicitacaoTFD;
  tamanhoKb: number;
  scanStatus: StatusScanAnexo;
  uploadEm: string;
}

export interface SolicitacaoTFD {
  id: string;
  protocolo: string;          // TFD-YYYY-NNNNNN
  pacienteId: string;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  ubsId: string;
  ubsNome: string | null;
  encaminhamentoOrigemId: string | null;
  destino: string;
  unidadeDestino: string | null;
  especialidade: string;
  motivo: string;
  dataDesejada: string;       // YYYY-MM-DD
  acompanhanteNecessario: boolean;
  prioridade: PrioridadeTFD;
  status: StatusSolicitacaoTFD;
  observacoes: string | null;
  motivoNegacao: string | null;
  viagemId: string | null;
  criadaEm: string;
  decididaEm: string | null;
  decididaPorId: string | null;
  anexos: AnexoSolicitacaoTFD[];
}

export interface CriarSolicitacaoRequest {
  pacienteId: string;
  ubsId: string;
  encaminhamentoOrigemId?: string;
  destino: string;
  unidadeDestino?: string;
  especialidade: string;
  motivo: string;
  dataDesejada: string;
  acompanhanteNecessario?: boolean;
  prioridade: PrioridadeTFD;
  observacoes?: string;
  prefeituraId?: string;
}

export interface AprovarSolicitacaoRequest {
  observacoes?: string;
  /** Se informado, aprova + aloca atomicamente. Reduz cliques no painel. */
  alocacao?: { viagemId: string; numeroAssento?: number };
}

// ---------- Viagens (BlaBlaCar style) ----------
export type StatusViagem = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type PresencaPassageiro =
  | 'AGUARDANDO' | 'CONFIRMADO' | 'EMBARCADO' | 'AUSENTE' | 'DESISTIU';

export interface PassageiroViagem {
  id: string;
  solicitacaoId: string;
  protocolo: string | null;
  pacienteId: string;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  especialidade: string | null;
  prioridade: PrioridadeTFD | null;
  /** Assento (1..vagasTotais). null = alocação livre (sem mapa de assentos). */
  numeroAssento: number | null;
  acompanhante: boolean;
  presenca: PresencaPassageiro;
  observacao: string | null;
  marcadoEm: string | null;
}

export interface ViagemFrota {
  id: string;
  data: string;                  // YYYY-MM-DD
  horaSaida: string;             // HH:mm
  horaPrevistaRetorno: string | null;
  veiculoId: string;
  veiculoPlaca: string | null;
  veiculoModelo: string | null;
  veiculoCapacidade: number | null;
  motoristaId: string;
  motoristaNome: string | null;
  destino: string;
  unidadeDestino: string | null;
  rotaResumo: string | null;
  kmEstimados: number | null;
  kmInicialHodometro: number | null;
  kmFinalHodometro: number | null;
  vagasTotais: number;
  vagasOcupadas: number;
  observacoes: string | null;
  status: StatusViagem;
  motivoCancelamento: string | null;
  criadaEm: string;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  passageiros: PassageiroViagem[];
  /** Lista de assentos ocupados — pra o frontend renderizar mapa. */
  assentosOcupados: number[];
  prefeituraId: string;
}

export interface CriarViagemRequest {
  data: string;                  // YYYY-MM-DD
  horaSaida: string;             // HH:mm
  horaPrevistaRetorno?: string;
  /** Use `veiculoId` OU `placa` (UX BlaBlaCar — backend resolve). */
  veiculoId?: string;
  placa?: string;
  motoristaId: string;
  destino: string;
  unidadeDestino?: string;
  rotaResumo?: string;
  kmEstimados?: number;
  /** Se omitido, default = capacidade do veículo. */
  vagasTotais?: number;
  observacoes?: string;
  prefeituraId?: string;
}

export interface AtualizarViagemRequest {
  data?: string;
  horaSaida?: string;
  horaPrevistaRetorno?: string;
  destino?: string;
  unidadeDestino?: string;
  rotaResumo?: string;
  kmEstimados?: number;
  observacoes?: string;
}

export interface IniciarViagemRequest { kmInicialHodometro: number; }
export interface ConcluirViagemRequest {
  kmFinalHodometro: number;
  observacoes?: string;
}
export interface CancelarViagemRequest { motivo: string; }
export interface AlocarPassageiroRequest {
  solicitacaoId: string;
  /** Opcional. Se null, alocação livre. Se preenchido, validado contra mapa. */
  numeroAssento?: number;
}
export interface MarcarPresencaRequest {
  presenca: 'CONFIRMADO' | 'EMBARCADO' | 'AUSENTE' | 'DESISTIU';
  observacao?: string;
}

// ---------- Abastecimento ----------
export type StatusAbastecimento = 'SOLICITADO' | 'LIBERADO' | 'REALIZADO' | 'NEGADO';

export interface Abastecimento {
  id: string;
  protocolo: string;             // ABT-YYYY-NNNNNN
  veiculoId: string;
  veiculoPlaca: string | null;
  motoristaId: string | null;
  motoristaNome: string | null;
  viagemId: string | null;
  posto: string;
  combustivel: Combustivel;
  litros: number;
  valorPorLitro: number;
  valorEstimado: number;
  valorTotal: number;            // 0 enquanto SOLICITADO/LIBERADO; valor real em REALIZADO
  hodometroKm: number;
  kmDesdeUltimo: number | null;
  consumoCalcKml: number | null;
  status: StatusAbastecimento;
  motivoNegacao: string | null;
  temComprovante: boolean;
  solicitadoEm: string;
  liberadoEm: string | null;
  realizadoEm: string | null;
  prefeituraId: string;
}

export interface SolicitarAbastecimentoRequest {
  /** Use `veiculoId` OU `placa`. */
  veiculoId?: string;
  placa?: string;
  motoristaId?: string;
  viagemId?: string;
  posto: string;
  combustivel: Combustivel;
  /** Modo "valor direto" (UX balcão) — informa só o valor total. */
  valorEstimado?: number;
  /** Modo "litros × preço" — backend faz multiplicação. */
  litrosEstimados?: number;
  valorPorLitroEstimado?: number;
  hodometroKm: number;
  prefeituraId?: string;
}

export interface RegistrarComprovanteAbastecimentoRequest {
  litros: number;
  valorPorLitro: number;
  valorTotal: number;
  hodometroKm: number;
  /** File via FormData. */
  file: File;
}

// ---------- Saldo ----------
export interface SaldoVeiculo {
  veiculoId: string;
  veiculoPlaca: string | null;
  veiculoModelo: string | null;
  mes: string;                   // YYYY-MM
  saldoMensal: number;
  saldoConsumido: number;
  saldoReservado: number;
  saldoDisponivel: number;
  prefeituraId: string;
}
export interface AjustarSaldoRequest {
  veiculoId: string;
  mes: string;                   // YYYY-MM
  novoSaldoMensal: number;
  justificativa: string;         // min 10 chars
}

// ---------- Ajuda de Custo ----------
export type StatusAjudaCusto =
  | 'PENDENTE' | 'AUTORIZADA' | 'PAGA' | 'NEGADA' | 'CANCELADA';
export type CategoriaAjuda =
  | 'ALIMENTACAO' | 'HOSPEDAGEM' | 'DESLOCAMENTO_LOCAL' | 'OUTRO';
export type MetodoPagamento = 'PIX' | 'TRANSFERENCIA' | 'DINHEIRO_RH';

export interface ItemAjudaCusto {
  categoria: CategoriaAjuda;
  descricao: string;
  valorBRL: number;
}

export interface AjudaCusto {
  id: string;
  protocolo: string;             // AJC-YYYY-NNNNNN
  viagemId: string;
  pacienteId: string;
  pacienteNome: string | null;
  pacienteCpf: string | null;
  itens: ItemAjudaCusto[];
  valorTotal: number;
  status: StatusAjudaCusto;
  metodoPagamento: MetodoPagamento | null;
  motivoNegacao: string | null;
  temComprovante: boolean;
  criadaEm: string;
  autorizadaEm: string | null;
  pagaEm: string | null;
  prefeituraId: string;
}

export interface SolicitarAjudaCustoRequest {
  viagemId: string;
  pacienteId: string;
  itens: ItemAjudaCusto[];       // min 1, max 20
  prefeituraId?: string;
}

// ---------- Auditoria ----------
export type AcaoAuditoriaTFD =
  | 'VEICULO_CRIADO' | 'VEICULO_ATUALIZADO' | 'VEICULO_MANUTENCAO'
  | 'VEICULO_REATIVADO' | 'VEICULO_DELETADO'
  | 'MOTORISTA_CRIADO' | 'MOTORISTA_ATUALIZADO' | 'MOTORISTA_AFASTADO'
  | 'MOTORISTA_REATIVADO' | 'MOTORISTA_DELETADO'
  | 'SOLICITACAO_CRIADA' | 'SOLICITACAO_APROVADA' | 'SOLICITACAO_NEGADA'
  | 'SOLICITACAO_ANEXO_ENVIADO'
  | 'VIAGEM_CRIADA' | 'VIAGEM_ATUALIZADA' | 'VIAGEM_INICIADA'
  | 'VIAGEM_CONCLUIDA' | 'VIAGEM_CANCELADA'
  | 'PASSAGEIRO_ALOCADO' | 'PASSAGEIRO_REMOVIDO' | 'PRESENCA_MARCADA'
  | 'ABASTECIMENTO_SOLICITADO' | 'ABASTECIMENTO_LIBERADO'
  | 'ABASTECIMENTO_NEGADO' | 'ABASTECIMENTO_REALIZADO'
  | 'SALDO_AJUSTADO'
  | 'AJUDA_CUSTO_CRIADA' | 'AJUDA_CUSTO_AUTORIZADA' | 'AJUDA_CUSTO_PAGA'
  | 'AJUDA_CUSTO_NEGADA';

export interface RegistroAuditoriaTFD {
  id: string;
  acao: AcaoAuditoriaTFD;
  recursoTipo: string;
  recursoId: string;
  recursoProtocolo: string | null;
  operadorId: string;
  operadorNome: string;
  operadorMatricula: string;
  operadorRole: string;
  ip: string;
  userAgent: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  hashAnterior: string;          // SHA-256 hex (64 chars)
  hash: string;                  // SHA-256 hex
  em: string;
  prefeituraId: string;
}
```

---

## 4. Endpoints por agrupamento

### 4.1 Frota (`/tfd/veiculos`)

| Método | Rota | Body | Response |
|---|---|---|---|
| GET | `/veiculos` | — | `Veiculo[]` |
| POST | `/veiculos` | `CriarVeiculoRequest` | `Veiculo` (201) |
| GET | `/veiculos/:id` | — | `Veiculo` |
| PATCH | `/veiculos/:id` | `AtualizarVeiculoRequest` | `Veiculo` |
| POST | `/veiculos/:id/manutencao` | — | `Veiculo` (status=EM_MANUTENCAO) |
| POST | `/veiculos/:id/reativar` | — | `Veiculo` (status=ATIVO) |
| DELETE | `/veiculos/:id` | — | 204 (apenas ADMIN/DEV; bloqueia se há viagens AGENDADA/EM_ANDAMENTO) |

#### Exemplo: criar veículo

```ts
const veiculo = await api.tfd.veiculos.criar({
  placa: 'PEQ1A23',
  modelo: 'Mercedes Sprinter 415',
  tipo: 'VAN',
  capacidade: 15,
  ano: 2023,
  combustivel: 'DIESEL',
  consumoMedioKml: 8.5,
  hodometroAtualKm: 45000
});
// → 201 { id, placa: "PEQ1A23", capacidade: 15, ... }
```

### 4.2 Motoristas (`/tfd/motoristas`)

| Método | Rota | Body | Response |
|---|---|---|---|
| GET | `/motoristas` | — | `Motorista[]` |
| POST | `/motoristas` | `CriarMotoristaRequest` | `Motorista` (201) |
| GET | `/motoristas/:id` | — | `Motorista` (`cnhVencidaEm` em dias — negativo = vencida) |
| PATCH | `/motoristas/:id` | `AtualizarMotoristaRequest` | `Motorista` |
| POST | `/motoristas/:id/afastar` | — | `Motorista` |
| POST | `/motoristas/:id/reativar` | — | `Motorista` |
| DELETE | `/motoristas/:id` | — | 204 (apenas ADMIN/DEV) |

#### UX recomendada: badge de CNH

```svelte
{#if motorista.cnhVencidaEm < 0}
  <Badge color="red">CNH VENCIDA há {-motorista.cnhVencidaEm}d</Badge>
{:else if motorista.cnhVencidaEm < 30}
  <Badge color="amber">CNH vence em {motorista.cnhVencidaEm}d</Badge>
{/if}
```

### 4.3 Solicitações TFD (`/tfd/solicitacoes`)

| Método | Rota | Body / Query | Response |
|---|---|---|---|
| GET | `/solicitacoes` | `?status=&prioridade=&q=` | `SolicitacaoTFD[]` |
| POST | `/solicitacoes` | `CriarSolicitacaoRequest` | `SolicitacaoTFD` (201) |
| GET | `/solicitacoes/:id` | — | `SolicitacaoTFD` |
| POST | `/solicitacoes/:id/aprovar` | `AprovarSolicitacaoRequest` | `SolicitacaoTFD` |
| POST | `/solicitacoes/:id/negar` | `{ motivo }` (≥10 chars) | `SolicitacaoTFD` |
| POST | `/solicitacoes/:id/anexos` | `multipart/form-data { tipo, file }` | `AnexoSolicitacaoTFD` (201) |
| GET | `/anexos/:id/download` | — | binary (apenas se `scanStatus=LIMPO`) |

#### Aprovar simples vs aprovar+alocar

```ts
// Aprovar e deixar pra alocar depois
await api.tfd.solicitacoes.aprovar(solicitacaoId, {});

// Aprovar + jogar na viagem X no assento 5 (atômico — UX BlaBlaCar)
await api.tfd.solicitacoes.aprovar(solicitacaoId, {
  alocacao: { viagemId: 'uuid-da-viagem', numeroAssento: 5 }
});
```

Validações no aprovar+alocar (acontecem ANTES de qualquer escrita):
- Viagem está `AGENDADA`
- Capacidade não cheia
- Assento dentro de [1..vagasTotais]
- Assento livre

### 4.4 Viagens (`/tfd/viagens`)

| Método | Rota | Body | Response |
|---|---|---|---|
| GET | `/viagens` | `?status=&desde=&ate=` | `ViagemFrota[]` |
| POST | `/viagens` | `CriarViagemRequest` | `ViagemFrota` (201) |
| GET | `/viagens/:id` | — | `ViagemFrota` (com `passageiros` e `assentosOcupados`) |
| PATCH | `/viagens/:id` | `AtualizarViagemRequest` | `ViagemFrota` |
| POST | `/viagens/:id/iniciar` | `{ kmInicialHodometro }` | `ViagemFrota` |
| POST | `/viagens/:id/concluir` | `{ kmFinalHodometro, observacoes? }` | `ViagemFrota` |
| POST | `/viagens/:id/cancelar` | `{ motivo }` (≥10 chars) | `ViagemFrota` |
| POST | `/viagens/:id/passageiros` | `AlocarPassageiroRequest` | `ViagemFrota` (201) |
| DELETE | `/viagens/:id/passageiros/:pid` | — | `ViagemFrota` |
| POST | `/viagens/:id/passageiros/:pid/presenca` | `MarcarPresencaRequest` | `ViagemFrota` |

#### Criar viagem por placa (UX BlaBlaCar)

```ts
const viagem = await api.tfd.viagens.criar({
  data: '2026-05-20',
  horaSaida: '07:00',
  horaPrevistaRetorno: '18:00',
  placa: 'PEQ1A23',                // ← placa em vez de veiculoId
  motoristaId,
  destino: 'Recife',
  unidadeDestino: 'Hospital das Clínicas - UFPE'
  // vagasTotais omitido → backend usa capacidade do veículo
});
// → vagasTotais = 15 (capacidade da Sprinter)
```

#### Mapa de assentos (UX BlaBlaCar)

```svelte
<script lang="ts">
  import { api } from '$lib/api/client';
  let { viagem }: { viagem: ViagemFrota } = $props();

  function isLivre(n: number) {
    return !viagem.assentosOcupados.includes(n);
  }
  function passageiroDoAssento(n: number) {
    return viagem.passageiros.find(p => p.numeroAssento === n);
  }
</script>

<div class="grid grid-cols-4 gap-2">
  {#each Array.from({ length: viagem.vagasTotais }, (_, i) => i + 1) as n}
    <button
      class="p-3 rounded border-2 {isLivre(n) ? 'border-emerald-500 bg-emerald-50' : 'border-red-300 bg-red-50'}"
      disabled={!isLivre(n)}
      onclick={() => alocar(n)}
    >
      <div class="font-bold">Assento {n}</div>
      {#if !isLivre(n)}
        <div class="text-xs">{passageiroDoAssento(n)?.pacienteNome}</div>
      {/if}
    </button>
  {/each}
</div>
```

#### Iniciar viagem

```ts
await api.tfd.viagens.iniciar(viagemId, { kmInicialHodometro: 45000 });
```

Validações:
- Veículo `ATIVO` (não em manutenção)
- Motorista `ATIVO` + CNH não vencida
- `kmInicialHodometro` >= hodômetro atual do veículo

#### Concluir viagem

```ts
await api.tfd.viagens.concluir(viagemId, {
  kmFinalHodometro: 45380,
  observacoes: 'Sem intercorrências'
});
```

Side-effects atômicos:
- Atualiza hodômetro do veículo → 45380
- Soma `+1` em `motorista.totalViagens` e `+380` em `totalKmRodados`
- Marca todas as solicitações alocadas como `REALIZADA`

#### Cancelar viagem

```ts
await api.tfd.viagens.cancelar(viagemId, {
  motivo: 'Veículo quebrado em manutenção emergencial'
});
```

Side-effect: solicitações alocadas voltam pra `APROVADA` (podem ser realocadas).

### 4.5 Abastecimento (`/tfd/abastecimentos`)

| Método | Rota | Body | Response |
|---|---|---|---|
| GET | `/abastecimentos` | `?status=&veiculoId=&desde=&ate=` | `Abastecimento[]` |
| POST | `/abastecimentos` | `SolicitarAbastecimentoRequest` | `Abastecimento` (201, status=SOLICITADO) |
| POST | `/abastecimentos/:id/liberar` | `{ observacao? }` | `Abastecimento` (status=LIBERADO + reserva saldo) |
| POST | `/abastecimentos/:id/negar` | `{ motivo }` (≥10 chars) | `Abastecimento` (status=NEGADO) |
| POST | `/abastecimentos/:id/comprovante` | `multipart { litros, valorPorLitro, valorTotal, hodometroKm, file }` | `Abastecimento` (status=REALIZADO) |
| GET | `/abastecimentos/:id/comprovante` | — | binary |

#### Modo balcão (UX simples — só o valor)

```ts
await api.tfd.abastecimentos.solicitar({
  placa: 'PEQ1A23',           // ← placa em vez de veiculoId
  motoristaId,
  posto: 'Posto BR Centro',
  combustivel: 'DIESEL',
  valorEstimado: 500,         // ← UX balcão — só o valor importa
  hodometroKm: 45100
});
```

Backend grava `litros: 0`, `valorPorLitro: 0` — preenchidos no comprovante depois.

#### Modo cálculo (litros × preço)

```ts
await api.tfd.abastecimentos.solicitar({
  veiculoId,
  posto: 'Posto BR',
  combustivel: 'DIESEL',
  litrosEstimados: 80,
  valorPorLitroEstimado: 6.25,    // backend calcula valorEstimado = 80 × 6.25 = R$500
  hodometroKm: 45100
});
```

#### Workflow completo de abastecimento

```
SOLICITADO → LIBERADO (gestor aprova; reserva valor no saldo)
                 ↓
           REALIZADO (motorista anexa comprovante; libera reservado, debita real)
                 ↓
              ou NEGADO em qualquer ponto antes de REALIZADO
```

Limite: o `valorTotal` no comprovante não pode exceder em mais de **5%** o `valorEstimado` (regra anti-fraude). Se exceder → `422 VALOR_EXCEDE_LIMITE`.

### 4.6 Saldo (`/tfd/saldo`)

| Método | Rota | Query | Response |
|---|---|---|---|
| GET | `/saldo` | `?mes=YYYY-MM` (default: corrente) | `SaldoVeiculo[]` |
| POST | `/saldo/ajustar` | `AjustarSaldoRequest` | `SaldoVeiculo` (apenas ADMIN/DEV) |

```ts
// Ajustar saldo (UX: modal "ajustar orçamento mensal")
await api.tfd.saldo.ajustar({
  veiculoId,
  mes: '2026-05',
  novoSaldoMensal: 5000,
  justificativa: 'Aumento orçamentário aprovado pela SMS - ofício 042/2026'
});
```

> **Regra de negócio**: dia 1º de cada mês, um cron automático cria os saldos do novo mês copiando o `saldoMensal` do mês anterior (zera `consumido` e `reservado`). Se o servidor estava down dia 1º, faz catch-up no boot.

### 4.7 Ajuda de Custo (`/tfd/ajudas-custo`)

| Método | Rota | Body | Response |
|---|---|---|---|
| GET | `/ajudas-custo` | `?status=&pacienteId=` | `AjudaCusto[]` |
| GET | `/ajudas-custo/:id` | — | `AjudaCusto` |
| POST | `/ajudas-custo` | `SolicitarAjudaCustoRequest` | `AjudaCusto` (201) |
| POST | `/ajudas-custo/:id/autorizar` | — | `AjudaCusto` (status=AUTORIZADA) |
| POST | `/ajudas-custo/:id/pagar` | `multipart { metodoPagamento, file }` | `AjudaCusto` (apenas ADMIN/DEV) |
| POST | `/ajudas-custo/:id/negar` | `{ motivo }` | `AjudaCusto` |

```ts
await api.tfd.ajudasCusto.solicitar({
  viagemId,
  pacienteId,
  itens: [
    { categoria: 'ALIMENTACAO', descricao: 'Almoço + jantar Recife', valorBRL: 60 },
    { categoria: 'DESLOCAMENTO_LOCAL', descricao: 'Uber HC ↔ rodoviária', valorBRL: 40 }
  ]
});
// → valorTotal = 100, status = PENDENTE
```

> **Anti-fraude**: o mesmo paciente não pode receber duas ajudas pra mesma viagem. UNIQUE composto `(viagemId, pacienteId)` no DB → `409 AJUDA_DUPLICADA`.

### 4.8 Auditoria (`/tfd/auditoria`)

| Método | Rota | Query | Response |
|---|---|---|---|
| GET | `/auditoria` | `?recursoTipo=&recursoId=&desde=&ate=` | `RegistroAuditoriaTFD[]` |
| GET | `/auditoria/:id` | — | `RegistroAuditoriaTFD` |
| GET | `/auditoria/exportar-tj?mes=YYYY-MM` | — | binary (ZIP) |
| GET | `/auditoria/verificar` | — | `{ total, corrompidos: string[] }` (apenas DEV) |

#### Cadeia hash criptográfica

Cada registro tem `hash = SHA-256(...)` encadeado com o `hashAnterior` da mesma prefeitura. Adulterar 1 registro quebra todos os subsequentes. UI sugerida:

```svelte
<table>
  <thead><tr><th>Quando</th><th>Ação</th><th>Operador</th><th>Hash</th></tr></thead>
  <tbody>
    {#each registros as r}
      <tr>
        <td>{new Date(r.em).toLocaleString('pt-BR')}</td>
        <td>{r.acao}</td>
        <td>{r.operadorMatricula} ({r.operadorRole})</td>
        <td class="font-mono text-xs">{r.hash.slice(0, 12)}…</td>
      </tr>
    {/each}
  </tbody>
</table>
```

#### Export TJ (ZIP assinado)

```ts
async function downloadExportTJ(mes: string) {
  const blob = await api.tfd.auditoria.exportarTJ(mes);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tfd-${mes}.zip`;
  a.click();
}
```

Headers HTTP da resposta:
- `X-Modo-Assinatura: ICP_BRASIL` ou `HASH_ONLY`
- `X-Sha256-Conteudo: <hex>` — hash do conteúdo
- `X-Manifest-Hash: <hex>` — hash do manifest
- `X-Cert-Subject: ...` — quando ICP-Brasil ativo

ZIP contém: `manifest.json`, `auditoria.csv`, `viagens.csv`, `abastecimentos.csv`, `ajudas-custo.csv`, `saldo-mensal.csv` + (se ICP) `assinatura.p7s`, `cert.pem`.

---

## 5. Jornadas

### Jornada A — UBS solicita TFD pra paciente

```
1. ATENDENTE_UBS abre /ubs/pacientes/[id]/encaminhamentos
2. Cria SolicitaçãoTFD via:
     POST /v1/tfd/solicitacoes
     { pacienteId, ubsId, destino: "Recife", especialidade: "Cardio",
       motivo: "Consulta especializada eletiva",
       dataDesejada: "2026-06-10", prioridade: "ELETIVA" }
   → status PENDENTE, protocolo TFD-2026-NNNNNN

3. Anexa comprovante (encaminhamento aprovado):
     POST /v1/tfd/solicitacoes/:id/anexos
     FormData { tipo: "COMPROVANTE_ENCAMINHAMENTO", file }

4. Frontend exibe protocolo + status PENDENTE; aguarda decisão SMS.
```

### Jornada B — Gestor TFD aprova + agenda viagem (BlaBlaCar)

```
1. GESTOR_TFD abre /tfd/dashboard/solicitacoes (filtro PENDENTE)
2. Clica numa solicitação → ve detalhes + anexos
3. Decide aprovar e:
   3a. Cria viagem nova (BlaBlaCar UI):
       POST /v1/tfd/viagens
       { data: "2026-06-10", horaSaida: "06:00",
         placa: "PEQ1A23",        // digita a placa
         motoristaId, destino: "Recife" }
       → vagasTotais = 15 (capacidade), assentosOcupados = []

   3b. Aprova solicitação + aloca direto no assento (1 request, atômico):
       POST /v1/tfd/solicitacoes/:id/aprovar
       { alocacao: { viagemId, numeroAssento: 5 } }
       → solicitação ALOCADA, viagem.assentosOcupados = [5]

4. Sistema notifica paciente via app (Face 3):
     "Sua viagem TFD foi agendada para 10/06 às 06:00.
      Veículo PEQ-1A23, motorista Carlos. Assento 5."
```

### Jornada C — Motorista solicita abastecimento (UX balcão)

```
1. GESTOR_TFD (ou DEV) abre /tfd/abastecimento → "+ Solicitar"
2. Modal pede: placa + posto + valor estimado
     POST /v1/tfd/abastecimentos
     { placa: "PEQ1A23", posto: "Posto BR", combustivel: "DIESEL",
       valorEstimado: 500, hodometroKm: 45100 }
     → ABT-2026-NNNNNN, status SOLICITADO

3. Aprovador (gestor) clica "Liberar":
     POST /v1/tfd/abastecimentos/:id/liberar
     → status LIBERADO, valor R$500 reservado no saldo do mês

4. Motorista volta com cupom → operador anexa:
     POST /v1/tfd/abastecimentos/:id/comprovante
     FormData { litros: 78.5, valorPorLitro: 6.20, valorTotal: 487.30,
                hodometroKm: 45200, file }
     → status REALIZADO
     → veículo.hodometroAtualKm = 45200
     → saldo: R$500 reservado liberado, R$487.30 debitado
```

### Jornada D — Dia da viagem

```
06:00 - Motorista chega ao veículo
6:00 → POST /v1/tfd/viagens/:id/iniciar { kmInicialHodometro: 45200 }
        → status EM_ANDAMENTO
        Validações: veículo ATIVO, motorista ATIVO + CNH não vencida

6:30 - Pacientes embarcam
6:30 → Para cada passageiro:
        POST /v1/tfd/viagens/:id/passageiros/:pid/presenca
        { presenca: "EMBARCADO" }

18:30 - Volta a Águas Belas
18:30 → POST /v1/tfd/viagens/:id/concluir { kmFinalHodometro: 45580 }
        → status CONCLUIDA
        → 380 km adicionados ao motorista
        → solicitações marcadas como REALIZADA
```

### Jornada E — Pagamento de ajuda de custo

```
1. Antes da viagem, GESTOR_TFD cria ajuda:
     POST /v1/tfd/ajudas-custo
     { viagemId, pacienteId, itens: [
         { categoria: "ALIMENTACAO", descricao: "Almoço Recife", valorBRL: 50 },
         { categoria: "DESLOCAMENTO_LOCAL", descricao: "Uber", valorBRL: 30 }
     ]}
     → AJC-2026-NNNNNN, status PENDENTE, valorTotal R$80

2. GESTOR autoriza:
     POST /v1/tfd/ajudas-custo/:id/autorizar
     → status AUTORIZADA

3. ADMIN paga (via PIX) e anexa comprovante:
     POST /v1/tfd/ajudas-custo/:id/pagar
     FormData { metodoPagamento: "PIX", file: <PDF do PIX> }
     → status PAGA
```

### Jornada F — Fim do mês: prestação de contas TJ

```
1. Mês fecha (ex.: 30 de junho)
2. ADMIN abre /tfd/auditoria → "Exportar para TJ"
3. Frontend faz: GET /v1/tfd/auditoria/exportar-tj?mes=2026-06
4. Browser baixa tfd-AAAAAAAA-2026-06.zip
5. ZIP contém:
   - manifest.json (com hashInicial, hashFinal, hashManifesto)
   - 5 CSVs (auditoria, viagens, abastecimentos, ajudas, saldo)
   - assinatura.p7s + cert.pem (se ICP-Brasil ativo)
6. ADMIN entrega ZIP ao TJ via PJe; TJ valida assinatura externamente.
```

---

## 6. Códigos de erro

Todos os erros seguem o shape:
```json
{ "error": { "code": "...", "message": "...", "details": {...} } }
```

### Catálogo TFD (códigos novos vs herdados)

| HTTP | Code | Quando | Como tratar no frontend |
|---|---|---|---|
| 400 | `PAYLOAD_INVALIDO` | Validação Zod falhou (`details.issues`) | mostrar campo a campo |
| 401 | `TOKEN_*` | auth padrão | redirect login |
| 403 | `ROLE_NAO_PERMITIDO` | role sem permissão na rota | esconder botão |
| 404 | `VEICULO_NAO_ENCONTRADO` | veículo deletado, placa não existe ou outra prefeitura | "Veículo não encontrado" |
| 404 | `MOTORISTA_NAO_ENCONTRADO` | idem | idem |
| 404 | `SOLICITACAO_NAO_ENCONTRADA` | idem | idem |
| 404 | `VIAGEM_NAO_ENCONTRADA` | idem | idem |
| 404 | `ABASTECIMENTO_NAO_ENCONTRADO` | idem | idem |
| 404 | `AJUDA_NAO_ENCONTRADA` | idem | idem |
| 404 | `ANEXO_NAO_ENCONTRADO` | id inválido ou outra prefeitura | idem |
| 404 | `COMPROVANTE_AUSENTE` | tentou GET /comprovante mas ainda não foi enviado | "Anexe o comprovante primeiro" |
| 409 | `PLACA_DUPLICADA` | placa já existe ativa na prefeitura | mostrar inline no campo placa |
| 409 | `CPF_DUPLICADO` | CPF já cadastrado em motorista ativo | mostrar inline no campo CPF |
| 409 | `STATUS_INVALIDO` | tentou ação em status incompatível | desabilitar botão |
| 409 | `STATUS_TERMINAL` | tentou editar viagem CONCLUIDA/CANCELADA | esconder botão editar |
| 409 | `VIAGEM_STATUS_INVALIDO` | aprovar+alocar em viagem que não é AGENDADA | "Esta viagem não aceita mais passageiros" |
| 409 | `ASSENTO_OCUPADO` | tentou alocar em assento já tomado | refresh do mapa de assentos |
| 409 | `CAPACIDADE_EXCEDIDA` | tentou alocar mas viagem está cheia | "Viagem cheia" + sugerir outra |
| 409 | `ANEXO_NAO_LIBERADO` | tentou download mas scanStatus != LIMPO | "Em verificação de segurança" |
| 409 | `AJUDA_DUPLICADA` | mesmo paciente já tem ajuda na viagem | mostrar protocolo existente |
| 409 | `VEICULO_EM_USO` | tentou deletar mas há viagens AGENDADA/EM_ANDAMENTO | "Conclua/cancele as viagens primeiro" |
| 409 | `MOTORISTA_EM_USO` | idem | idem |
| 422 | `VEICULO_REQUERIDO` | nem `veiculoId` nem `placa` informados | input obrigatório |
| 422 | `VALOR_REQUERIDO` | abastecimento sem `valorEstimado` nem (`litros` + `preço`) | "Informe o valor" |
| 422 | `VALOR_INVALIDO` | valor ≤ 0 | validar inline |
| 422 | `ASSENTO_INVALIDO` | assento fora de [1..vagasTotais] | clamp no UI |
| 422 | `VAGAS_INVALIDAS` | vagasTotais < 1 | validar inline |
| 422 | `VAGAS_EXCEDEM_CAPACIDADE` | vagasTotais > capacidade veículo | mostrar capacidade do veículo escolhido |
| 422 | `CNH_VENCIDA` | tentou iniciar viagem com motorista CNH expirada | "Renove a CNH antes" |
| 422 | `MOTORISTA_INDISPONIVEL` | motorista AFASTADO ou INATIVO | sugerir trocar motorista |
| 422 | `VEICULO_INDISPONIVEL` | veículo EM_MANUTENCAO ao iniciar viagem | sugerir trocar veículo |
| 422 | `HODOMETRO_INVALIDO` | km decrescente ou < hodômetro atual | mostrar hodômetro atual do veículo |
| 422 | `SALDO_INSUFICIENTE` | abastecimento com saldo do mês insuficiente | mostrar saldo disponível + sugerir ajuste |
| 422 | `VALOR_EXCEDE_LIMITE` | comprovante com valor > 5% acima do estimado | "Solicite aprovação adicional" |
| 422 | `MOTIVO_OBRIGATORIO` | motivo de cancelar/negar < 10 chars | textarea obrigatório |
| 422 | `JUSTIFICATIVA_OBRIGATORIA` | ajuste de saldo sem justificativa | idem |
| 422 | `SOLICITACAO_NAO_APROVADA` | tentou alocar solicitação não aprovada | aprovar primeiro |
| 422 | `DATA_INVALIDA` | parse falhou | validador de data |
| 422 | `CPF_INVALIDO` | CPF != 11 dígitos | mask no input |
| 422 | `VALIDADE_CNH_INVALIDA` | data inválida | datepicker |
| 422 | `ITENS_OBRIGATORIOS` | ajuda sem itens | "Adicione pelo menos 1 item" |

### Helper de tradução pt-BR

```ts
const ERROS_TFD: Record<string, string> = {
  PLACA_DUPLICADA: 'Já existe um veículo ativo com essa placa',
  CPF_DUPLICADO: 'Já existe um motorista ativo com esse CPF',
  ASSENTO_OCUPADO: 'Esse assento já está ocupado',
  ASSENTO_INVALIDO: 'Assento fora do intervalo do veículo',
  CAPACIDADE_EXCEDIDA: 'Viagem cheia — escolha outra',
  CNH_VENCIDA: 'CNH do motorista está vencida',
  SALDO_INSUFICIENTE: 'Saldo do mês insuficiente — solicite ajuste',
  VALOR_EXCEDE_LIMITE: 'Valor excede 5% do estimado — requer aprovação adicional',
  AJUDA_DUPLICADA: 'Esse paciente já tem ajuda de custo nessa viagem',
  TRANSICAO_INVALIDA: 'Transição de status não permitida',
  VIAGEM_REALIZADA_IMUTAVEL: 'Viagem REALIZADA não pode ser excluída',
  // ... adicione conforme aparecer
};
```

---

## 7. Cliente TfdApi

Cole isso em `src/lib/api/client.ts` substituindo o mock:

```ts
import type {
  Veiculo, CriarVeiculoRequest, AtualizarVeiculoRequest,
  Motorista, CriarMotoristaRequest, AtualizarMotoristaRequest,
  SolicitacaoTFD, CriarSolicitacaoRequest, AprovarSolicitacaoRequest,
  AnexoSolicitacaoTFD, TipoAnexoSolicitacaoTFD,
  ViagemFrota, CriarViagemRequest, AtualizarViagemRequest,
  IniciarViagemRequest, ConcluirViagemRequest, CancelarViagemRequest,
  AlocarPassageiroRequest, MarcarPresencaRequest,
  Abastecimento, SolicitarAbastecimentoRequest,
  RegistrarComprovanteAbastecimentoRequest,
  SaldoVeiculo, AjustarSaldoRequest,
  AjudaCusto, SolicitarAjudaCustoRequest, MetodoPagamento,
  RegistroAuditoriaTFD,
} from './tfd-types';

class TfdApi {
  constructor(private readonly api: ApiClient) {}

  // ============ Veículos ============
  veiculos = {
    list: (): Promise<Veiculo[]> =>
      this.api.get('/tfd/veiculos'),
    create: (req: CriarVeiculoRequest): Promise<Veiculo> =>
      this.api.post('/tfd/veiculos', req),
    byId: (id: string): Promise<Veiculo> =>
      this.api.get(`/tfd/veiculos/${encodeURIComponent(id)}`),
    update: (id: string, req: AtualizarVeiculoRequest): Promise<Veiculo> =>
      this.api.patch(`/tfd/veiculos/${encodeURIComponent(id)}`, req),
    setStatus: (id: string, status: 'manutencao' | 'reativar'): Promise<Veiculo> =>
      this.api.post(`/tfd/veiculos/${encodeURIComponent(id)}/${status}`),
    remove: (id: string): Promise<void> =>
      this.api.delete(`/tfd/veiculos/${encodeURIComponent(id)}`),
  };

  // ============ Motoristas ============
  motoristas = {
    list: (): Promise<Motorista[]> =>
      this.api.get('/tfd/motoristas'),
    create: (req: CriarMotoristaRequest): Promise<Motorista> =>
      this.api.post('/tfd/motoristas', req),
    byId: (id: string): Promise<Motorista> =>
      this.api.get(`/tfd/motoristas/${encodeURIComponent(id)}`),
    update: (id: string, req: AtualizarMotoristaRequest): Promise<Motorista> =>
      this.api.patch(`/tfd/motoristas/${encodeURIComponent(id)}`, req),
    setStatus: (id: string, status: 'afastar' | 'reativar'): Promise<Motorista> =>
      this.api.post(`/tfd/motoristas/${encodeURIComponent(id)}/${status}`),
    remove: (id: string): Promise<void> =>
      this.api.delete(`/tfd/motoristas/${encodeURIComponent(id)}`),
  };

  // ============ Solicitações ============
  solicitacoes = {
    list: (q?: { status?: string; prioridade?: string; q?: string }): Promise<SolicitacaoTFD[]> =>
      this.api.get('/tfd/solicitacoes', q as Record<string, unknown>),
    create: (req: CriarSolicitacaoRequest): Promise<SolicitacaoTFD> =>
      this.api.post('/tfd/solicitacoes', req),
    byId: (id: string): Promise<SolicitacaoTFD> =>
      this.api.get(`/tfd/solicitacoes/${encodeURIComponent(id)}`),
    aprovar: (id: string, req: AprovarSolicitacaoRequest = {}): Promise<SolicitacaoTFD> =>
      this.api.post(`/tfd/solicitacoes/${encodeURIComponent(id)}/aprovar`, req),
    negar: (id: string, motivo: string): Promise<SolicitacaoTFD> =>
      this.api.post(`/tfd/solicitacoes/${encodeURIComponent(id)}/negar`, { motivo }),
    anexar: async (id: string, file: File, tipo: TipoAnexoSolicitacaoTFD): Promise<AnexoSolicitacaoTFD> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tipo', tipo);
      return this.api.postMultipart(`/tfd/solicitacoes/${encodeURIComponent(id)}/anexos`, fd);
    },
    downloadAnexo: (anexoId: string): Promise<{ blob: Blob; filename: string }> =>
      this.api.getBlob(`/tfd/anexos/${encodeURIComponent(anexoId)}/download`),
  };

  // ============ Viagens ============
  viagens = {
    list: (q?: { status?: string; desde?: string; ate?: string }): Promise<ViagemFrota[]> =>
      this.api.get('/tfd/viagens', q as Record<string, unknown>),
    create: (req: CriarViagemRequest): Promise<ViagemFrota> =>
      this.api.post('/tfd/viagens', req),
    byId: (id: string): Promise<ViagemFrota> =>
      this.api.get(`/tfd/viagens/${encodeURIComponent(id)}`),
    update: (id: string, req: AtualizarViagemRequest): Promise<ViagemFrota> =>
      this.api.patch(`/tfd/viagens/${encodeURIComponent(id)}`, req),
    iniciar: (id: string, req: IniciarViagemRequest): Promise<ViagemFrota> =>
      this.api.post(`/tfd/viagens/${encodeURIComponent(id)}/iniciar`, req),
    concluir: (id: string, req: ConcluirViagemRequest): Promise<ViagemFrota> =>
      this.api.post(`/tfd/viagens/${encodeURIComponent(id)}/concluir`, req),
    cancelar: (id: string, motivo: string): Promise<ViagemFrota> =>
      this.api.post(`/tfd/viagens/${encodeURIComponent(id)}/cancelar`, { motivo }),
    alocarPassageiro: (id: string, req: AlocarPassageiroRequest): Promise<ViagemFrota> =>
      this.api.post(`/tfd/viagens/${encodeURIComponent(id)}/passageiros`, req),
    removerPassageiro: (id: string, passageiroId: string): Promise<ViagemFrota> =>
      this.api.delete(`/tfd/viagens/${encodeURIComponent(id)}/passageiros/${encodeURIComponent(passageiroId)}`),
    marcarPresenca: (id: string, passageiroId: string, req: MarcarPresencaRequest): Promise<ViagemFrota> =>
      this.api.post(
        `/tfd/viagens/${encodeURIComponent(id)}/passageiros/${encodeURIComponent(passageiroId)}/presenca`,
        req,
      ),
  };

  // ============ Abastecimento ============
  abastecimentos = {
    list: (q?: { status?: string; veiculoId?: string; desde?: string; ate?: string }): Promise<Abastecimento[]> =>
      this.api.get('/tfd/abastecimentos', q as Record<string, unknown>),
    solicitar: (req: SolicitarAbastecimentoRequest): Promise<Abastecimento> =>
      this.api.post('/tfd/abastecimentos', req),
    liberar: (id: string, observacao?: string): Promise<Abastecimento> =>
      this.api.post(`/tfd/abastecimentos/${encodeURIComponent(id)}/liberar`, { observacao }),
    negar: (id: string, motivo: string): Promise<Abastecimento> =>
      this.api.post(`/tfd/abastecimentos/${encodeURIComponent(id)}/negar`, { motivo }),
    registrarComprovante: async (id: string, req: RegistrarComprovanteAbastecimentoRequest): Promise<Abastecimento> => {
      const fd = new FormData();
      fd.append('file', req.file);
      fd.append('litros', String(req.litros));
      fd.append('valorPorLitro', String(req.valorPorLitro));
      fd.append('valorTotal', String(req.valorTotal));
      fd.append('hodometroKm', String(req.hodometroKm));
      return this.api.postMultipart(`/tfd/abastecimentos/${encodeURIComponent(id)}/comprovante`, fd);
    },
    downloadComprovante: (id: string): Promise<{ blob: Blob; filename: string }> =>
      this.api.getBlob(`/tfd/abastecimentos/${encodeURIComponent(id)}/comprovante`),
  };

  // ============ Saldo ============
  saldo = {
    list: (mes?: string): Promise<SaldoVeiculo[]> =>
      this.api.get('/tfd/saldo', mes ? { mes } : undefined),
    ajustar: (req: AjustarSaldoRequest): Promise<SaldoVeiculo> =>
      this.api.post('/tfd/saldo/ajustar', req),
  };

  // ============ Ajuda de Custo ============
  ajudasCusto = {
    list: (q?: { status?: string; pacienteId?: string }): Promise<AjudaCusto[]> =>
      this.api.get('/tfd/ajudas-custo', q as Record<string, unknown>),
    byId: (id: string): Promise<AjudaCusto> =>
      this.api.get(`/tfd/ajudas-custo/${encodeURIComponent(id)}`),
    solicitar: (req: SolicitarAjudaCustoRequest): Promise<AjudaCusto> =>
      this.api.post('/tfd/ajudas-custo', req),
    autorizar: (id: string): Promise<AjudaCusto> =>
      this.api.post(`/tfd/ajudas-custo/${encodeURIComponent(id)}/autorizar`),
    pagar: async (id: string, metodoPagamento: MetodoPagamento, file: File): Promise<AjudaCusto> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('metodoPagamento', metodoPagamento);
      return this.api.postMultipart(`/tfd/ajudas-custo/${encodeURIComponent(id)}/pagar`, fd);
    },
    negar: (id: string, motivo: string): Promise<AjudaCusto> =>
      this.api.post(`/tfd/ajudas-custo/${encodeURIComponent(id)}/negar`, { motivo }),
  };

  // ============ Auditoria ============
  auditoria = {
    list: (q?: { recursoTipo?: string; recursoId?: string; desde?: string; ate?: string }): Promise<RegistroAuditoriaTFD[]> =>
      this.api.get('/tfd/auditoria', q as Record<string, unknown>),
    byId: (id: string): Promise<RegistroAuditoriaTFD> =>
      this.api.get(`/tfd/auditoria/${encodeURIComponent(id)}`),
    verificar: (): Promise<{ total: number; corrompidos: string[] }> =>
      this.api.get('/tfd/auditoria/verificar'),
    exportarTJ: async (mes: string): Promise<Blob> => {
      const r = await fetch(`${this.api.baseUrl}/tfd/auditoria/exportar-tj?mes=${encodeURIComponent(mes)}`, {
        headers: this.api.headers(),
      });
      if (!r.ok) throw new Error(`export TJ falhou: HTTP ${r.status}`);
      return r.blob();
    },
  };
}

// Adicione na ApiClient:
class ApiClient {
  // ... métodos existentes (get, post, patch, delete, postMultipart, getBlob) ...
  readonly tfd: TfdApi;
  constructor() {
    this.tfd = new TfdApi(this);
  }
}
```

---

## 8. Padrões de UX

### 8.1 Resolver placa antes do submit (autocomplete)

Em vez de fazer o backend resolver a placa, dá pra fazer no frontend pra UX mais rica (autocomplete dropdown):

```ts
// 1. Carrega veículos no mount
const veiculos = await api.tfd.veiculos.list();

// 2. Autocomplete por placa
const placa = $state('');
const sugestoes = $derived(
  veiculos.filter(v => v.placa.includes(placa.toUpperCase()))
);

// 3. Quando usuário escolhe um, pega o ID
function escolher(v: Veiculo) {
  veiculoId = v.id;
  placa = v.placa;
}

// 4. Submit usando veiculoId (mais confiável que placa)
await api.tfd.viagens.create({ veiculoId, motoristaId, ... });
```

Mas se preferir UX mais rápida (sem autocomplete), use `placa` direto — backend resolve.

### 8.2 Polling do scanStatus de anexos

Anexos demoram 1-30s pro ClamAV escanear. Polling sugerido:

```ts
async function uploadEAguardarScan(file: File, tipo: TipoAnexoSolicitacaoTFD) {
  const anexo = await api.tfd.solicitacoes.anexar(solicId, file, tipo);
  // anexo.scanStatus = PENDENTE inicialmente

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const sol = await api.tfd.solicitacoes.byId(solicId);
    const a = sol.anexos.find(x => x.id === anexo.id);
    if (a?.scanStatus === 'LIMPO') return a;
    if (a?.scanStatus === 'INFECTADO') {
      throw new Error('Arquivo bloqueado pelo antivírus');
    }
  }
  // após 60s ainda PENDENTE — mostrar toast "Em verificação"
}
```

### 8.3 Mapa de assentos visual

```svelte
{#snippet assentoBox(n: number, ocupado: boolean, passageiro?: PassageiroViagem)}
  <button
    class="aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center
           {ocupado ? 'border-red-300 bg-red-50 cursor-not-allowed' : 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100'}"
    disabled={ocupado}
    onclick={() => alocar(n)}
  >
    <div class="text-2xl">🪑</div>
    <div class="text-xs font-bold">{n}</div>
    {#if passageiro}
      <div class="text-[10px] truncate w-full text-center">
        {passageiro.pacienteNome?.split(' ')[0]}
      </div>
    {/if}
  </button>
{/snippet}

<div class="grid grid-cols-{Math.min(viagem.vagasTotais, 4)} gap-2">
  {#each Array.from({ length: viagem.vagasTotais }, (_, i) => i + 1) as n}
    {@render assentoBox(
      n,
      viagem.assentosOcupados.includes(n),
      viagem.passageiros.find(p => p.numeroAssento === n)
    )}
  {/each}
</div>
```

### 8.4 Workflow inline (status pills + actions)

```svelte
{#if abast.status === 'SOLICITADO'}
  <button onclick={() => api.tfd.abastecimentos.liberar(abast.id)}>Liberar</button>
  <button onclick={() => abrirNegar(abast.id)} variant="danger">Negar</button>
{:else if abast.status === 'LIBERADO'}
  <button onclick={() => abrirComprovante(abast.id)}>Anexar comprovante</button>
{:else if abast.status === 'REALIZADO'}
  <Badge color="emerald">Concluído — R${abast.valorTotal}</Badge>
{:else if abast.status === 'NEGADO'}
  <Badge color="red">Negado: {abast.motivoNegacao}</Badge>
{/if}
```

### 8.5 Confirmação obrigatória em ações destrutivas

```ts
// Cancelar viagem precisa motivo ≥ 10 chars
async function cancelar(viagemId: string) {
  const motivo = await modalPrompt({
    titulo: 'Cancelar viagem',
    mensagem: 'Por favor descreva o motivo (mínimo 10 caracteres):',
    minLength: 10,
  });
  if (!motivo) return;
  await api.tfd.viagens.cancelar(viagemId, motivo);
  notificar('ok', 'Viagem cancelada. Solicitações foram liberadas.');
}
```

### 8.6 Catch-all error handler

```ts
import { ERROS_TFD } from '$lib/api/erros-tfd';

async function safeCall<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      const msg = ERROS_TFD[e.code] ?? e.message;
      notificar('erro', msg, { detalhes: e.details });
    } else {
      notificar('erro', 'Erro inesperado — tente novamente');
      console.error(e);
    }
    throw e;
  }
}

// uso
await safeCall(() => api.tfd.viagens.iniciar(id, { kmInicialHodometro: 45000 }));
```

---

## Checklist de implementação no frontend

### Setup
- [ ] Remover `tfd-mock.ts` (causa do erro `$state is not defined`)
- [ ] Copiar tipos para `src/lib/api/tfd-types.ts`
- [ ] Copiar `TfdApi` para `src/lib/api/client.ts`
- [ ] Criar `src/lib/api/erros-tfd.ts` com tradução pt-BR

### Páginas
- [ ] `/tfd/dashboard` — KPIs (count solicitações pendentes, viagens ativas)
- [ ] `/tfd/dashboard/solicitacoes` — fila de aprovação com `?status=PENDENTE`
- [ ] `/tfd/dashboard/viagens-ativas` — `?status=AGENDADA,EM_ANDAMENTO`
- [ ] `/tfd/solicitacoes` — lista + filtros + busca
- [ ] `/tfd/solicitacoes/[id]` — detalhe + anexos + aprovar/negar (com modal de aprovar+alocar)
- [ ] `/tfd/viagens` — calendário/lista
- [ ] `/tfd/viagens/nova` — wizard com **placa autocomplete** + escolha de motorista
- [ ] `/tfd/viagens/[id]` — detalhe + **mapa de assentos** + iniciar/concluir/cancelar
- [ ] `/tfd/frota` — CRUD veículos
- [ ] `/tfd/motoristas` — CRUD com badge CNH
- [ ] `/tfd/abastecimento` — modal "valor direto" como default
- [ ] `/tfd/saldo` — tabela mensal + modal ajustar (justificativa)
- [ ] `/tfd/ajuda-custo` — workflow PENDENTE → AUTORIZADA → PAGA
- [ ] `/tfd/auditoria` — trilha imutável (apenas ADMIN/DEV)
- [ ] `/tfd/auditoria/exportar-tj` — botão "Baixar ZIP"

### RBAC no UI
- [ ] Esconder menu `/tfd` para `REGULADOR_SMS`
- [ ] Esconder `Saldo Ajustar` e `Auditoria` pra `GESTOR_TFD`
- [ ] Esconder `Pagar Ajuda` pra `GESTOR_TFD` (só ADMIN/DEV)

---

*Última atualização: 2026-04-25 · Versão Face 4: v0.8.2 (BlaBlaCar UX)*
