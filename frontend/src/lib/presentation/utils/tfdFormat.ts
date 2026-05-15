/**
 * Helpers de formatação reusados nas páginas TFD.
 * O backend devolve valores "crus" (CPF dígitos, datas ISO etc.) — formatamos
 * apenas para exibição, sem mudar o dado.
 */

/** Formata um CPF de 11 dígitos como `123.456.789-01`. Inválido → original. */
export function formatarCpf(cpf: string | null | undefined): string {
	if (!cpf) return '—';
	const d = cpf.replace(/\D/g, '');
	if (d.length !== 11) return cpf;
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** ISO `YYYY-MM-DD` → `DD/MM/AAAA`. */
export function formatarData(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
	} catch {
		return iso;
	}
}

/** ISO 8601 completo → `DD/MM/AAAA HH:mm`. */
export function formatarDataHora(iso: string | null | undefined): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return iso;
	}
}

/** Número → moeda BRL. */
export function formatarBRL(n: number | null | undefined): string {
	if (n === null || n === undefined) return '—';
	return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Mês corrente em formato `YYYY-MM`. */
export function mesAtual(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Hoje em `YYYY-MM-DD`. */
export function hojeYmd(): string {
	return new Date().toISOString().slice(0, 10);
}
