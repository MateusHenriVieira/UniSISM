import { getContext, setContext } from 'svelte';
import type { Encaminhamento } from '$lib/domain/models/Encaminhamento';

export interface HistoricoContext {
	readonly lista: Encaminhamento[];
	readonly carregando: boolean;
}

const KEY = Symbol('historico-ctx');

export function setHistoricoContext(ctx: HistoricoContext) {
	setContext(KEY, ctx);
}

export function useHistorico(): HistoricoContext {
	const ctx = getContext<HistoricoContext>(KEY);
	if (!ctx) throw new Error('useHistorico deve ser chamado dentro de /ubs/historico');
	return ctx;
}
