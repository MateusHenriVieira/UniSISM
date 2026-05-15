/**
 * Re-exporta os contratos do encaminhamento a partir da fonte única
 * de verdade (`$lib/api/types`), sincronizada com o backend.
 */
export type {
	AnexoDocumento,
	Encaminhamento,
	EventoTimeline,
	ExtracaoPdfResultado,
	MetricasDashboard,
	Paciente,
	PrioridadeClinica,
	SolicitacaoMedica,
	StatusEncaminhamento,
	TipoAnexo,
	TipoEventoTimeline
} from '$lib/api/types';
