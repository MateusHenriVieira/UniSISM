import { getContext, setContext } from 'svelte';
import type { PacienteCompleto } from '$lib/domain/models/Paciente';

export interface PacienteContext {
	readonly paciente: PacienteCompleto | null;
	readonly carregando: boolean;
	readonly erro: boolean;
	/** Atualiza o paciente no context após um PATCH (mantém o prontuário em sync). */
	atualizar?: (novo: PacienteCompleto) => void;
}

const KEY = Symbol('paciente-ctx');

export function setPacienteContext(ctx: PacienteContext) {
	setContext(KEY, ctx);
}

export function usePaciente(): PacienteContext {
	const ctx = getContext<PacienteContext>(KEY);
	if (!ctx) throw new Error('usePaciente deve ser chamado dentro de /ubs/pacientes/[id]');
	return ctx;
}
