/**
 * Detector de campos essenciais faltantes no cadastro do paciente.
 *
 * **Fonte da verdade**: `CampoPacienteEssencial` em `$lib/api/types`,
 * definido pelo backend em `GET /pacientes/por-cpf/:cpf`. São os 10 campos
 * que o backend considera mínimos para um cadastro "completo" na UBS.
 *
 * Usos:
 *
 * 1. **Wizard de novo encaminhamento** — já recebe `camposFaltantes` direto
 *    do backend via `api.pacientes.porCpf()`. Não precisa recalcular.
 *
 * 2. **Página de detalhe do paciente** (`/ubs/pacientes/:id/*`) — badge
 *    `⚠ N CAMPOS PENDENTES` no header. Aqui o backend entrega
 *    `PacienteCompleto` e o frontend calcula os gaps localmente para
 *    UI — mas usando a **mesma lista canônica** de campos.
 */

import type { CampoPacienteEssencial, PacienteCompleto } from '$lib/api/types';

/** Rótulos pt-BR da lista canônica do backend. */
export const CAMPO_ESSENCIAL_LABEL: Record<CampoPacienteEssencial, string> = {
	nome: 'Nome Completo',
	dataNascimento: 'Data de Nascimento',
	sexo: 'Sexo',
	telefone: 'Telefone',
	nomeMae: 'Nome da Mãe',
	endereco: 'Endereço',
	bairro: 'Bairro',
	municipio: 'Município',
	uf: 'UF',
	cep: 'CEP'
};

const CAMPOS_ESSENCIAIS: readonly CampoPacienteEssencial[] = [
	'nome',
	'dataNascimento',
	'sexo',
	'telefone',
	'nomeMae',
	'endereco',
	'bairro',
	'municipio',
	'uf',
	'cep'
];

/** Sentinelas que o backend usa como "sem valor". */
const PLACEHOLDER_NASCIMENTO = '1970-01-01';

function vazio(v: unknown): boolean {
	if (v === undefined || v === null) return true;
	if (typeof v === 'string' && v.trim() === '') return true;
	if (v === 'NAO_INFORMADO' || v === 'NAO_INFORMADA') return true;
	return false;
}

export interface GapsPaciente {
	faltantes: CampoPacienteEssencial[];
	total: number;
	completo: boolean;
}

/**
 * Calcula campos essenciais faltantes de um `PacienteCompleto` (detail page).
 *
 * Para o wizard, use `api.pacientes.porCpf()` — o backend já entrega a lista.
 */
export function camposFaltantesPaciente(
	paciente: PacienteCompleto | null | undefined
): GapsPaciente {
	if (!paciente) {
		return { faltantes: [], total: 0, completo: true };
	}
	const faltantes = CAMPOS_ESSENCIAIS.filter((campo) => {
		if (campo === 'sexo') {
			// Sexo 'OUTRO' é sentinela quando não coletado.
			return paciente.sexo === 'OUTRO' || vazio(paciente.sexo);
		}
		if (campo === 'dataNascimento') {
			return vazio(paciente.dataNascimento) || paciente.dataNascimento === PLACEHOLDER_NASCIMENTO;
		}
		return vazio(paciente[campo]);
	});
	return {
		faltantes,
		total: faltantes.length,
		completo: faltantes.length === 0
	};
}

export function labelDe(campo: CampoPacienteEssencial): string {
	return CAMPO_ESSENCIAL_LABEL[campo];
}
