/**
 * Re-exporta os contratos do paciente/PEC a partir da fonte única
 * de verdade (`$lib/api/types`), sincronizada com o backend.
 */
export type {
	Alergia,
	Atendimento,
	CondicaoCronica,
	EstadoCivil,
	ExameRealizado,
	FiltroPacienteEspecial,
	GrupoSanguineo,
	MedicamentoEmUso,
	MedicoAtendente,
	PacienteCompleto,
	PacienteResumo,
	RacaCor,
	ResultadoExame,
	Sexo,
	StatusViagemTFD,
	TipoAtendimento,
	VacinaAplicada,
	ViagemTFD
} from '$lib/api/types';
