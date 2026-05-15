<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import TimelineStep from '$lib/presentation/components/TimelineStep.svelte';
	import { useEncaminhamento } from '$lib/presentation/contexts/encaminhamentoContext';

	const ctx = useEncaminhamento();
	let enc = $derived(ctx.encaminhamento!);

	let timeline = $derived(enc.timeline ?? []);
	let eventosReverso = $derived([...timeline].reverse());

	function formatarData(iso: string) {
		return new Date(iso).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function duracaoTotal(): string {
		if (timeline.length < 2) return '—';
		const inicio = new Date(timeline[0].em).getTime();
		const fim = new Date(timeline[timeline.length - 1].em).getTime();
		const diffMin = Math.round((fim - inicio) / 60000);
		if (diffMin < 60) return `${diffMin} min`;
		const h = Math.floor(diffMin / 60);
		const m = diffMin % 60;
		return `${h}h ${m}m`;
	}

	let atorUBS = $derived(
		timeline.filter((e) => e.autorPapel.toLowerCase().includes('atendente')).length
	);
	let atorSistema = $derived(timeline.filter((e) => e.autor === 'SISTEMA').length);
</script>

<section class="grid grid-cols-12 gap-4">
	<!-- Métricas -->
	<div class="col-span-12 grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard label="Total de Eventos" value={timeline.length} sublabel="Desde a criação" />
		<MetricCard label="Duração do Fluxo" value={duracaoTotal()} sublabel="Primeiro → último" />
		<MetricCard label="Ações da UBS" value={atorUBS} sublabel="Atendente UBS origem" />
		<MetricCard label="Eventos Automáticos" value={atorSistema} sublabel="Sistema UNISISM" />
	</div>

	<!-- Timeline completa -->
	<div class="col-span-12 border border-slate-200 bg-white xl:col-span-8">
		<PanelHeader
			title="Linha do Tempo"
			subtitle="Eventos do mais recente ao mais antigo"
			index="01"
		/>
		<div class="px-4 py-5">
			{#if eventosReverso.length === 0}
				<p class="font-mono text-xs text-slate-500">Nenhum evento registrado.</p>
			{:else}
				<ol>
					{#each eventosReverso as ev, i (ev.id)}
						<TimelineStep
							tipo={ev.tipo}
							titulo={ev.titulo}
							descricao={ev.descricao}
							autor={ev.autor}
							autorPapel={ev.autorPapel}
							em={ev.em}
							isLast={i === eventosReverso.length - 1}
						/>
					{/each}
				</ol>
			{/if}
		</div>
	</div>

	<!-- Auditoria + Legenda -->
	<aside class="col-span-12 flex flex-col gap-4 xl:col-span-4">
		<div class="border border-slate-200 bg-white">
			<PanelHeader title="Auditoria" subtitle="Rastreabilidade" index="02" />
			<dl class="divide-y divide-slate-100 font-mono text-[11px]">
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Protocolo</dt>
					<dd class="font-bold text-blue-900">{enc.protocolo}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Atendente UBS</dt>
					<dd class="truncate pl-2 text-slate-900">{enc.atendenteResponsavel}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Unidade</dt>
					<dd class="truncate pl-2 text-slate-900">{enc.unidadeOrigem}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Criado</dt>
					<dd class="text-slate-900">{formatarData(enc.criadoEm)}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Atualizado</dt>
					<dd class="text-slate-900">{formatarData(enc.atualizadoEm)}</dd>
				</div>
			</dl>
		</div>

		<div class="border border-slate-200 bg-white">
			<PanelHeader title="Legenda de Eventos" index="03" />
			<ul class="divide-y divide-slate-100 font-mono text-[11px]">
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-blue-900"></span>
					<span class="text-slate-700">Criação · Transmissão</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-slate-700"></span>
					<span class="text-slate-700">Anexo · Observação</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-amber-600"></span>
					<span class="text-slate-700">Pendência registrada</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-emerald-700"></span>
					<span class="text-slate-700">Aprovação · Agendamento</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-red-700"></span>
					<span class="text-slate-700">Rejeição</span>
				</li>
			</ul>
		</div>
	</aside>
</section>
