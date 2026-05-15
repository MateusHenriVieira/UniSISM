/**
 * Catálogo compartilhado do módulo de Relatórios.
 * Fonte: backend/docs/RELATORIOS_FRONTEND.md · v0.5.0
 *
 * Toda a lógica de "quem pode gerar o quê", "qual tipo aceita nominal",
 * "qual a mensagem em pt-BR pra cada ErrorCode" vive aqui — centralizada,
 * testável, sem duplicar no UBS e no SMS.
 */

import type { FormatoRelatorio, Role, TipoRelatorio } from '$lib/api/types';
import { ApiError } from '$lib/api';

// ============================================================
// Catálogo dos 7 tipos
// ============================================================

export interface TipoCatalogo {
	tipo: TipoRelatorio;
	titulo: string;
	descricao: string;
	icone: string;
	/** Roles que o backend aceita — replica §4.2 / §5 do guia. */
	rolesPermitidas: readonly Role[];
	/** Marca visualmente como "USO RESTRITO" — PDF vem com marca d'água. */
	restrito?: boolean;
	/** Admite modo nominal opt-in (`filtros.incluirNomes`). */
	permiteNominal?: boolean;
	/** Se o período é ignorado pelo backend (relatório "snapshot atual"). */
	periodoIgnorado?: boolean;
}

export const TIPOS_CATALOGO: readonly TipoCatalogo[] = [
	{
		tipo: 'FILA_REGULACAO',
		titulo: 'Fila de Regulação',
		descricao: 'Snapshot da fila atual · SLA e tempo médio por prioridade.',
		icone: '⏱',
		rolesPermitidas: ['REGULADOR_SMS', 'ADMIN', 'DESENVOLVEDOR'],
		periodoIgnorado: true
	},
	{
		tipo: 'ENCAMINHAMENTOS_POR_ESPECIALIDADE',
		titulo: 'Volume por Especialidade',
		descricao: 'Agregado estatístico — planejamento de capacidade assistencial.',
		icone: '🏥',
		rolesPermitidas: ['COORDENADOR_UBS', 'REGULADOR_SMS', 'ADMIN', 'DESENVOLVEDOR']
	},
	{
		tipo: 'PENDENCIAS_RESOLVIDAS',
		titulo: 'Pendências e Readequações',
		descricao: 'Tempo médio de resolução · motivos categorizados (sem texto livre).',
		icone: '✓',
		rolesPermitidas: ['COORDENADOR_UBS', 'REGULADOR_SMS', 'ADMIN', 'DESENVOLVEDOR']
	},
	{
		tipo: 'TFD_CUSTOS',
		titulo: 'Custos TFD',
		descricao: 'Tratamento Fora do Domicílio · viagens e valores.',
		icone: '🚐',
		rolesPermitidas: ['REGULADOR_SMS', 'ADMIN', 'DESENVOLVEDOR'],
		restrito: true
	},
	{
		tipo: 'VACINACAO_UBS',
		titulo: 'Vacinação por UBS',
		descricao: 'Doses agregadas por campanha e faixa etária.',
		icone: '💉',
		rolesPermitidas: ['COORDENADOR_UBS', 'ADMIN', 'DESENVOLVEDOR']
	},
	{
		tipo: 'BUSCA_ATIVA',
		titulo: 'Busca Ativa',
		descricao: 'Pacientes sem atendimento há 90+ dias · modo nominal opt-in.',
		icone: '🔎',
		rolesPermitidas: ['COORDENADOR_UBS', 'ADMIN', 'DESENVOLVEDOR'],
		permiteNominal: true
	},
	{
		tipo: 'PRODUCAO_INDIVIDUAL',
		titulo: 'Produção por Atendente',
		descricao: 'Volume individual e tempo médio de consolidação.',
		icone: '📊',
		rolesPermitidas: [
			'ATENDENTE_UBS',
			'COORDENADOR_UBS',
			'REGULADOR_SMS',
			'ADMIN',
			'DESENVOLVEDOR'
		],
		restrito: true
	}
] as const;

/** Retorna o subset de tipos que a role pode gerar. */
export function tiposPermitidosPara(role: Role | undefined): TipoCatalogo[] {
	if (!role) return [];
	return TIPOS_CATALOGO.filter((t) => t.rolesPermitidas.includes(role));
}

/** Busca metadata do tipo (nunca retorna `undefined` para tipos do enum). */
export function catalogoDe(tipo: TipoRelatorio): TipoCatalogo {
	const c = TIPOS_CATALOGO.find((t) => t.tipo === tipo);
	if (!c) throw new Error(`Tipo sem catálogo: ${tipo}`);
	return c;
}

// ============================================================
// Validação de período (§10.2 do guia)
// ============================================================

const UM_DIA_MS = 86_400_000;
const LIMITE_DIAS = 366;

/**
 * Valida período antes do POST — evita 400 desnecessário.
 * Retorna mensagem pt-BR ou `null` se OK.
 */
export function validarPeriodo(
	dataInicial: string,
	dataFinal: string,
	periodoIgnorado = false
): string | null {
	if (periodoIgnorado) return null;
	const a = new Date(dataInicial);
	const b = new Date(dataFinal);
	if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
		return 'Informe datas válidas no formato AAAA-MM-DD.';
	}
	const hoje = new Date();
	hoje.setHours(23, 59, 59, 999);
	if (a > b) return 'Data inicial deve ser anterior à data final.';
	if (b > hoje) return 'Data final não pode ser no futuro.';
	const dias = Math.floor((b.getTime() - a.getTime()) / UM_DIA_MS);
	if (dias > LIMITE_DIAS) return 'Período máximo permitido: 12 meses.';
	return null;
}

// ============================================================
// Mensagens amigáveis (§8.1 do guia)
// ============================================================

/** Traduz o `code` do ApiError em uma mensagem pt-BR curta. */
export function mensagemAmigavel(e: unknown): string {
	if (!(e instanceof ApiError)) return 'Falha de conexão com o servidor.';
	switch (e.code) {
		case 'TIPO_RELATORIO_INVALIDO':
			return 'Tipo de relatório inválido.';
		case 'PERIODO_INVALIDO':
			return 'Período inválido (máx. 12 meses, dataInicial ≤ dataFinal ≤ hoje).';
		case 'FORMATO_INVALIDO':
			return 'Formato inválido. Use PDF, CSV ou XLSX.';
		case 'PERMISSAO_INSUFICIENTE':
			return 'Você não tem permissão para gerar este tipo de relatório.';
		case 'PREFEITURA_OBRIGATORIA':
			return 'Selecione uma prefeitura (uso técnico · DESENVOLVEDOR).';
		case 'NOMINAL_NAO_PERMITIDO':
			return 'Este tipo não permite modo nominal.';
		case 'JUSTIFICATIVA_OBRIGATORIA':
			return 'A justificativa é obrigatória (mín. 30 caracteres).';
		case 'RATE_LIMIT_EXCEDIDO':
			return 'Muitas gerações recentes. Aguarde 1 minuto e tente novamente.';
		case 'RELATORIO_NAO_DISPONIVEL':
			return 'Relatório ainda está sendo gerado.';
		case 'RELATORIO_EXPIRADO':
			return 'Este relatório expirou (TTL 7 dias). Gere novamente.';
		case 'RELATORIO_NAO_ENCONTRADO':
			return 'Relatório não encontrado.';
		case 'ARQUIVO_NAO_ENCONTRADO':
			return 'Arquivo não disponível no storage. Gere novamente.';
		case 'ERRO_INTERNO':
			return 'Falha interna. Tente novamente em instantes.';
		default:
			return e.message || 'Falha ao executar operação.';
	}
}

// ============================================================
// Formatação display
// ============================================================

export const FORMATO_TONE: Record<FormatoRelatorio, string> = {
	PDF: 'border-red-700 bg-red-50 text-red-800',
	CSV: 'border-emerald-700 bg-emerald-50 text-emerald-800',
	XLSX: 'border-blue-900 bg-blue-50 text-blue-900'
};

export function tamanhoDisplay(kb: number): string {
	if (kb <= 0) return '—';
	if (kb < 1024) return `${kb} KB`;
	return `${(kb / 1024).toFixed(2)} MB`;
}

export function dataHoraDisplay(iso: string): string {
	return new Date(iso).toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function primeiroDoMes(): string {
	const d = new Date();
	d.setDate(1);
	return d.toISOString().slice(0, 10);
}

export function hojeYmd(): string {
	return new Date().toISOString().slice(0, 10);
}
