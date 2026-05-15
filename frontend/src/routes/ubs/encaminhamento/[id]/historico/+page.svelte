<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
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
</script>

<section class="grid grid-cols-12 gap-4">
	<!-- Métricas da timeline -->
	<div class="col-span-12 grid grid-cols-2 gap-3 md:grid-cols-4">
		<div class="relative border border-slate-200 bg-white px-4 py-3">
			<span class="absolute top-0 left-0 h-full w-1 bg-blue-900"></span>
			<div class="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Total de Eventos
			</div>
			<div class="mt-1 font-mono text-2xl font-bold text-slate-900">{timeline.length}</div>
		</div>
		<div class="relative border border-slate-200 bg-white px-4 py-3">
			<span class="absolute top-0 left-0 h-full w-1 bg-slate-400"></span>
			<div class="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Duração do Fluxo
			</div>
			<div class="mt-1 font-mono text-2xl font-bold text-slate-900">{duracaoTotal()}</div>
		</div>
		<div class="relative border border-slate-200 bg-white px-4 py-3">
			<span class="absolute top-0 left-0 h-full w-1 bg-emerald-700"></span>
			<div class="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Primeiro Evento
			</div>
			<div class="mt-1 font-mono text-xs font-bold text-slate-900">
				{timeline[0] ? formatarData(timeline[0].em) : '—'}
			</div>
		</div>
		<div class="relative border border-slate-200 bg-white px-4 py-3">
			<span class="absolute top-0 left-0 h-full w-1 bg-amber-600"></span>
			<div class="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
				Último Evento
			</div>
			<div class="mt-1 font-mono text-xs font-bold text-slate-900">
				{timeline[timeline.length - 1] ? formatarData(timeline[timeline.length - 1].em) : '—'}
			</div>
		</div>
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

	<!-- Auditoria -->
	<aside class="col-span-12 flex flex-col gap-4 xl:col-span-4">
		<div class="border border-slate-200 bg-white">
			<PanelHeader title="Auditoria" subtitle="Rastreabilidade" index="02" />
			<dl class="divide-y divide-slate-100 font-mono text-[11px]">
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Protocolo</dt>
					<dd class="font-bold text-blue-900">{enc.protocolo}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Atendente</dt>
					<dd class="font-bold text-slate-900">{enc.atendenteResponsavel}</dd>
				</div>
				<div class="flex items-center justify-between px-4 py-2.5">
					<dt class="tracking-widest text-slate-500 uppercase">Unidade</dt>
					<dd class="truncate text-slate-900">{enc.unidadeOrigem}</dd>
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
					<span class="text-slate-700">Criação / Transmissão</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-slate-700"></span>
					<span class="text-slate-700">Anexo / Observação</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-amber-600"></span>
					<span class="text-slate-700">Pendência</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-emerald-700"></span>
					<span class="text-slate-700">Aprovação / Agendamento</span>
				</li>
				<li class="flex items-center gap-2 px-4 py-2">
					<span class="h-2.5 w-2.5 bg-red-700"></span>
					<span class="text-slate-700">Rejeição</span>
				</li>
			</ul>
		</div>
	</aside>
</section>
