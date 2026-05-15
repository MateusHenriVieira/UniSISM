import { getContext, setContext } from 'svelte';
import type { Encaminhamento } from '$lib/domain/models/Encaminhamento';

export interface EncaminhamentoContext {
	readonly encaminhamento: Encaminhamento | null;
	readonly carregando: boolean;
	readonly erro: boolean;
	atualizar: (enc: Encaminhamento) => void;
}

const KEY = Symbol('encaminhamento-ctx');

export function setEncaminhamentoContext(ctx: EncaminhamentoContext) {
	setContext(KEY, ctx);
}

export function useEncaminhamento(): EncaminhamentoContext {
	const ctx = getContext<EncaminhamentoContext>(KEY);
	if (!ctx) {
		throw new Error('useEncaminhamento deve ser chamado dentro de /ubs/encaminhamento/[id]');
	}
	return ctx;
}
