<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { usePaciente } from '$lib/presentation/contexts/pacienteContext';
	import { api } from '$lib/api';
	import type { Encaminhamento } from '$lib/api/types';
	import { onMount } from 'svelte';

	const ctx = usePaciente();
	let p = $derived(ctx.paciente!);

	let doPaciente = $state<Encaminhamento[]>([]);
	let carregando = $state(true);

	onMount(async () => {
		try {
			doPaciente = await api.encaminhamentos.list({ pacienteId: p.id, limit: 500 });
		} finally {
			carregando = false;
		}
	});

	let ativos = $derived(
		doPaciente.filter(
			(e) => e.status === 'AGUARDANDO_REGULACAO' || e.status === 'PENDENCIA_DOCUMENTO'
		).length
	);
	let aprovados = $derived(doPaciente.filter((e) => e.status === 'APROVADO').length);
	let rejeitados = $derived(doPaciente.filter((e) => e.status === 'REJEITADO').length);
</script>

<div class="flex flex-col gap-4">
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard
			label="Total Histórico"
			value={carregando ? '—' : doPaciente.length}
			sublabel="Encaminhamentos do paciente"
		/>
		<MetricCard
			label="Ativos"
			value={carregando ? '—' : ativos}
			sublabel="Em fila ou com pendência"
			accent="warning"
		/>
		<MetricCard
			label="Aprovados"
			value={carregando ? '—' : aprovados}
			sublabel="Pela regulação"
			accent="success"
		/>
		<MetricCard
			label="Rejeitados"
			value={carregando ? '—' : rejeitados}
			sublabel="Fora de protocolo"
			accent="critical"
		/>
	</section>

	<HistoricoTable
		titulo="Encaminhamentos do Paciente"
		subtitulo="Histórico completo · cruza dados cross-UBS"
		lista={doPaciente}
		{carregando}
		detalheBasePath="/sms/encaminhamento"
	/>
</div>
