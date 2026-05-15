<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento } from '$lib/api/types';
	import { onMount } from 'svelte';

	/**
	 * Rejeitados pela Regulação — encaminhamentos com status REJEITADO.
	 * Decisões definitivas. Útil para auditoria e relatórios mensais.
	 */

	let rejeitados = $state<Encaminhamento[]>([]);
	let carregando = $state(true);

	onMount(async () => {
		try {
			rejeitados = await api.encaminhamentos.list({ status: 'REJEITADO', limit: 500 });
		} finally {
			carregando = false;
		}
	});

	let hoje = $derived(
		rejeitados.filter((e) => {
			const d = new Date(e.atualizadoEm);
			const agora = new Date();
			return (
				d.getFullYear() === agora.getFullYear() &&
				d.getMonth() === agora.getMonth() &&
				d.getDate() === agora.getDate()
			);
		}).length
	);

	let ultimaSemana = $derived(
		rejeitados.filter((e) => {
			const dias = (Date.now() - new Date(e.atualizadoEm).getTime()) / 86_400_000;
			return dias <= 7;
		}).length
	);

	/** Top-1 especialidade mais rejeitada. */
	let topEspecialidade = $derived.by(() => {
		if (rejeitados.length === 0) return '—';
		const contagem = new Map<string, number>();
		for (const e of rejeitados) {
			const k = e.solicitacao.especialidadeSolicitada;
			contagem.set(k, (contagem.get(k) ?? 0) + 1);
		}
		let top = '—';
		let max = 0;
		for (const [k, v] of contagem) {
			if (v > max) {
				max = v;
				top = k;
			}
		}
		return top;
	});
</script>

<div class="flex flex-col gap-4">
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard
			label="Total Rejeitados"
			value={carregando ? '—' : rejeitados.length}
			sublabel="Decisões definitivas"
			accent="critical"
		/>
		<MetricCard
			label="Rejeitados Hoje"
			value={carregando ? '—' : hoje}
			sublabel="Decididos nas últimas 24h"
			accent="critical"
		/>
		<MetricCard
			label="Última Semana"
			value={carregando ? '—' : ultimaSemana}
			sublabel="Volume dos últimos 7 dias"
		/>
		<MetricCard
			label="Especialidade Top"
			value={topEspecialidade}
			sublabel="Maior volume rejeitado"
		/>
	</section>

	<HistoricoTable
		titulo="Encaminhamentos Rejeitados"
		subtitulo="Decisões negativas da Regulação · base para auditoria e relatórios mensais"
		lista={rejeitados}
		{carregando}
		mostrarStatus={false}
		detalheBasePath="/sms/encaminhamento"
	/>
</div>
