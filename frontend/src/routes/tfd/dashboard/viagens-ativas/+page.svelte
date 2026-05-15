<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { api } from '$lib/api';
	import { mensagemErroTfd } from '$lib/api/erros-tfd';
	import { formatarData } from '$lib/presentation/utils/tfdFormat';
	import type { ViagemFrota } from '$lib/api/tfd-types';
	import { onMount } from 'svelte';

	let viagens = $state<ViagemFrota[]>([]);
	let carregando = $state(true);
	let erro = $state<string | null>(null);

	const emRota = $derived(viagens.filter((v) => v.status === 'EM_ANDAMENTO'));
	const agendadas = $derived(viagens.filter((v) => v.status === 'AGENDADA'));

	function ocupacaoTone(o: number, c: number): string {
		if (c === 0) return 'border-slate-300 bg-slate-50 text-slate-600';
		const pct = (o / c) * 100;
		if (pct >= 90) return 'border-red-700 bg-red-50 text-red-800';
		if (pct >= 60) return 'border-amber-600 bg-amber-50 text-amber-800';
		return 'border-emerald-700 bg-emerald-50 text-emerald-800';
	}

	async function carregar() {
		carregando = true;
		erro = null;
		try {
			viagens = await api.tfd.viagens.list();
		} catch (e) {
			erro = mensagemErroTfd(e);
		} finally {
			carregando = false;
		}
	}

	onMount(carregar);
</script>

<div class="flex flex-col gap-4">
	{#if erro}
		<div
			class="border border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
		>
			⚠ {erro}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
		<MetricCard
			label="Em Rota Agora"
			value={carregando ? '—' : emRota.length}
			sublabel="Viagens ativas"
			accent="warning"
		/>
		<MetricCard
			label="Agendadas"
			value={carregando ? '—' : agendadas.length}
			sublabel="Saída pendente"
			accent="default"
		/>
		<MetricCard
			label="Total de Passageiros"
			value={carregando ? '—' : viagens.reduce((acc, v) => acc + v.vagasOcupadas, 0)}
			sublabel="Em viagens ativas + agendadas"
			accent="success"
		/>
	</div>

	<div class="border border-slate-200 bg-white">
		<PanelHeader title="Viagens em Andamento" subtitle="Frota fora da garagem agora" index="01" />
		{#if carregando}
			<div class="px-4 py-6"><div class="h-5 w-full animate-pulse bg-slate-100"></div></div>
		{:else if emRota.length === 0}
			<div class="px-4 py-6 text-center font-mono text-xs text-slate-500">
				Nenhuma viagem em andamento.
			</div>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each emRota as v (v.id)}
					<li>
						<a
							href={`/tfd/viagens/${v.id}`}
							class="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
						>
							<div class="leading-tight">
								<div class="font-mono text-xs font-bold text-slate-900">
									{v.veiculoPlaca ?? '—'} · {v.destino}
								</div>
								<div class="font-mono text-[10px] text-slate-500">
									{v.motoristaNome ?? '—'} · iniciada em
									{v.iniciadaEm ? new Date(v.iniciadaEm).toLocaleString('pt-BR') : '—'}
								</div>
							</div>
							<span
								class="border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase {ocupacaoTone(
									v.vagasOcupadas,
									v.vagasTotais
								)}"
							>
								{v.vagasOcupadas}/{v.vagasTotais}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="border border-slate-200 bg-white">
		<PanelHeader title="Próximas Agendadas" subtitle="Saídas no calendário" index="02" />
		{#if carregando}
			<div class="px-4 py-6"><div class="h-5 w-full animate-pulse bg-slate-100"></div></div>
		{:else if agendadas.length === 0}
			<div class="px-4 py-6 text-center font-mono text-xs text-slate-500">
				Nenhuma viagem agendada.
			</div>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each agendadas as v (v.id)}
					<li>
						<a
							href={`/tfd/viagens/${v.id}`}
							class="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
						>
							<div class="leading-tight">
								<div class="font-mono text-xs font-bold text-slate-900">
									{v.veiculoPlaca ?? '—'} · {v.destino}
								</div>
								<div class="font-mono text-[10px] text-slate-500">
									{v.motoristaNome ?? '—'} · {formatarData(v.data)} · saída {v.horaSaida}
								</div>
							</div>
							<span
								class="border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase {ocupacaoTone(
									v.vagasOcupadas,
									v.vagasTotais
								)}"
							>
								{v.vagasOcupadas}/{v.vagasTotais}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
