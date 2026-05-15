<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import IngestoesBreadcrumb from '$lib/presentation/components/IngestoesBreadcrumb.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento, Ubs } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let ubsId = $derived(decodeURIComponent(page.params.ubsId ?? ''));
	let ano = $derived(Number(page.params.ano ?? '0'));
	let mes = $derived(Number(page.params.mes ?? '0'));

	let encs = $state<Encaminhamento[]>([]);
	let ubs = $state<Ubs | null>(null);
	let carregando = $state(true);

	const mesNomes = [
		'Janeiro',
		'Fevereiro',
		'Março',
		'Abril',
		'Maio',
		'Junho',
		'Julho',
		'Agosto',
		'Setembro',
		'Outubro',
		'Novembro',
		'Dezembro'
	];

	onMount(async () => {
		try {
			const [listaEnc, listaUbs] = await Promise.all([
				api.encaminhamentos.list({ limit: 1000 }),
				api.admin.listUbs()
			]);
			const ubsMatch = listaUbs.find((u) => u.id === ubsId) ?? null;
			ubs = ubsMatch;
			encs = listaEnc.filter((e) => {
				const d = new Date(e.criadoEm);
				return (
					(ubsMatch ? e.unidadeOrigem.includes(ubsMatch.nome) : e.unidadeOrigem === ubsId) &&
					d.getFullYear() === ano &&
					d.getMonth() + 1 === mes
				);
			});
		} finally {
			carregando = false;
		}
	});

	let nomeUbs = $derived(ubs?.nome ?? ubsId);
	let nomeMes = $derived(mes >= 1 && mes <= 12 ? mesNomes[mes - 1] : '—');

	interface PastaDia {
		dia: number;
		total: number;
		aguardando: number;
		pendencia: number;
		aprovado: number;
		rejeitado: number;
	}

	let pastas = $derived.by<PastaDia[]>(() => {
		const m = new Map<number, PastaDia>();
		for (const e of encs) {
			const dia = new Date(e.criadoEm).getDate();
			const prev =
				m.get(dia) ??
				({
					dia,
					total: 0,
					aguardando: 0,
					pendencia: 0,
					aprovado: 0,
					rejeitado: 0
				} satisfies PastaDia);
			prev.total++;
			if (e.status === 'AGUARDANDO_REGULACAO') prev.aguardando++;
			else if (e.status === 'PENDENCIA_DOCUMENTO') prev.pendencia++;
			else if (e.status === 'APROVADO') prev.aprovado++;
			else if (e.status === 'REJEITADO') prev.rejeitado++;
			m.set(dia, prev);
		}
		return [...m.values()].sort((a, b) => b.dia - a.dia);
	});

	function diaSemana(ano: number, mes: number, dia: number): string {
		const d = new Date(ano, mes - 1, dia);
		return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];
	}
</script>

<div class="flex flex-col gap-4">
	<IngestoesBreadcrumb
		items={[
			{ label: 'Arquivo', href: '/sms/ingestoes' },
			{ label: nomeUbs, href: `/sms/ingestoes/${encodeURIComponent(ubsId)}` },
			{ label: String(ano), href: `/sms/ingestoes/${encodeURIComponent(ubsId)}/${ano}` },
			{ label: nomeMes }
		]}
	/>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title={`${nomeUbs} · ${nomeMes} / ${ano}`}
			subtitle="Cada dia abre a lista de encaminhamentos criados"
			index="01"
		>
			<span
				class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
			>
				{pastas.length} DIA{pastas.length === 1 ? '' : 'S'} COM DADOS
			</span>
		</PanelHeader>

		{#if carregando}
			<div class="grid grid-cols-3 gap-px bg-slate-200 md:grid-cols-5 xl:grid-cols-7">
				{#each Array(14) as _, i (i)}
					<div class="bg-white p-3">
						<div class="h-20 w-full animate-pulse bg-slate-100"></div>
					</div>
				{/each}
			</div>
		{:else if pastas.length === 0}
			<div class="px-4 py-12 text-center font-mono text-xs text-slate-500">
				Nenhum encaminhamento neste mês.
			</div>
		{:else}
			<div class="grid grid-cols-3 gap-px bg-slate-200 md:grid-cols-5 xl:grid-cols-7">
				{#each pastas as p (p.dia)}
					<button
						type="button"
						onclick={() =>
							goto(
								`/sms/ingestoes/${encodeURIComponent(ubsId)}/${ano}/${String(mes).padStart(2, '0')}/${String(p.dia).padStart(2, '0')}`
							)}
						class="group flex flex-col bg-white px-3 py-3 text-left transition-colors hover:bg-slate-50"
					>
						<div class="flex items-baseline justify-between">
							<div class="font-mono text-2xl font-bold text-slate-900 group-hover:text-blue-900">
								{String(p.dia).padStart(2, '0')}
							</div>
							<span
								class="font-mono text-[9px] font-bold tracking-widest text-slate-500 uppercase"
							>
								{diaSemana(ano, mes, p.dia)}
							</span>
						</div>
						<div class="mt-1 font-mono text-[10px] font-bold text-slate-700">
							{p.total} enc.
						</div>
						<div class="mt-1 flex flex-wrap gap-0.5 text-[9px] font-mono">
							{#if p.aguardando > 0}
								<span class="border border-blue-700 bg-blue-50 px-1 py-px font-bold text-blue-900">⏱{p.aguardando}</span>
							{/if}
							{#if p.pendencia > 0}
								<span class="border border-amber-600 bg-amber-50 px-1 py-px font-bold text-amber-800">⚠{p.pendencia}</span>
							{/if}
							{#if p.aprovado > 0}
								<span class="border border-emerald-700 bg-emerald-50 px-1 py-px font-bold text-emerald-800">✓{p.aprovado}</span>
							{/if}
							{#if p.rejeitado > 0}
								<span class="border border-red-700 bg-red-50 px-1 py-px font-bold text-red-800">✗{p.rejeitado}</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
