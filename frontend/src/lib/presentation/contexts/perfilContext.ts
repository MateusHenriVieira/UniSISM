import { getContext, setContext } from 'svelte';
import type { AtendentePerfil } from '$lib/api/types';

export interface PerfilContext {
	readonly perfil: AtendentePerfil | null;
	readonly carregando: boolean;
}

const KEY = Symbol('perfil-ctx');

export function setPerfilContext(ctx: PerfilContext) {
	setContext(KEY, ctx);
}

export function usePerfil(): PerfilContext {
	const ctx = getContext<PerfilContext>(KEY);
	if (!ctx) throw new Error('usePerfil deve ser chamado dentro de /ubs/perfil');
	return ctx;
}
