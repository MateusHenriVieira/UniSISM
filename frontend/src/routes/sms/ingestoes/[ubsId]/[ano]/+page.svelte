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

	let encs = $state<Encaminhamento[]>([]);
	let ubs = $state<Ubs | null>(null);
	let carregando = $state(true);

	onMount(async () => {
		try {
			const [listaEnc, listaUbs] = await Promise.all([
				api.encaminhamentos.list({ limit: 1000 }),
				api.admin.listUbs()
			]);
			const ubsMatch = listaUbs.find((u) => u.id === ubsId) ?? null;
			ubs = ubsMatch;
			encs = listaEnc.filter(
				(e) =>
					(ubsMatch ? e.unidadeOrigem.includes(ubsMatch.nome) : e.unidadeOrigem === ubsId) &&
					new Date(e.criadoEm).getFullYear() === ano
			);
		} finally {
			carregando = false;
		}
	});

	let nomeUbs = $derived(ubs?.nome ?? ubsId);

	interface PastaMes {
		mes: number;
		nome: string;
		total: number;
		aguardando: number;
		pendencia: number;
		aprovado: number;
		rejeitado: number;
	}

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

	let pastas = $derived.by<PastaMes[]>(() => {
		const m = new Map<number, PastaMes>();
		for (const e of encs) {
			const mes = new Date(e.criadoEm).getMonth();
			const prev =
				m.get(mes) ??
				({
					mes,
					nome: mesNomes[mes],
					total: 0,
					aguardando: 0,
					pendencia: 0,
					aprovado: 0,
					rejeitado: 0
				} satisfies PastaMes);
			prev.total++;
			if (e.status === 'AGUARDANDO_REGULACAO') prev.aguardando++;
			else if (e.status === 'PENDENCIA_DOCUMENTO') prev.pendencia++;
			else if (e.status === 'APROVADO') prev.aprovado++;
			else if (e.status === 'REJEITADO') prev.rejeitado++;
			m.set(mes, prev);
		}
		return [...m.values()].sort((a, b) => b.mes - a.mes);
	});
</script>

<div class="flex flex-col gap-4">
	<IngestoesBreadcrumb
		items={[
			{ label: 'Arquivo', href: '/sms/ingestoes' },
			{ label: nomeUbs, href: `/sms/ingestoes/${encodeURIComponent(ubsId)}` },
			{ label: String(ano) }
		]}
	/>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title={`${nomeUbs} · ${ano}`}
			subtitle="Selecione o mês para ver os dias com ingestões"
			index="01"
		>
			<span
				class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
			>
				{pastas.length} MÊS{pastas.length === 1 ? '' : 'ES'} COM DADOS
			</span>
		</PanelHeader>

		{#if carregando}
			<div class="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
				{#each Array(8) as _, i (i)}
					<div class="bg-white p-4">
						<div class="h-24 w-full animate-pulse bg-slate-100"></div>
					</div>
				{/each}
			</div>
		{:else if pastas.length === 0}
			<div class="px-4 py-12 text-center font-mono text-xs text-slate-500">
				Nenhum encaminhamento neste ano.
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4 xl:grid-cols-6">
				{#each pastas as p (p.mes)}
					<button
						type="button"
						onclick={() =>
							goto(
								`/sms/ingestoes/${encodeURIComponent(ubsId)}/${ano}/${String(p.mes + 1).padStart(2, '0')}`
							)}
						class="group flex flex-col bg-white px-4 py-5 text-left transition-colors hover:bg-slate-50"
					>
						<div class="flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-6 w-6 text-slate-600 group-hover:text-blue-900"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
								/>
							</svg>
							<div class="font-mono text-[10px] tracking-widest text-slate-500 uppercase">
								{String(p.mes + 1).padStart(2, '0')} · {ano}
							</div>
						</div>
						<div class="mt-2 font-mono text-lg font-bold text-slate-900 group-hover:text-blue-900">
							{p.nome}
						</div>
						<div class="mt-1 font-mono text-xs font-bold text-slate-900">
							{p.total} encaminhamento{p.total === 1 ? '' : 's'}
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-mono">
							{#if p.aguardando > 0}
								<span class="border border-blue-700 bg-blue-50 px-1 py-px font-bold text-blue-900">⏱ {p.aguardando}</span>
							{/if}
							{#if p.pendencia > 0}
								<span class="border border-amber-600 bg-amber-50 px-1 py-px font-bold text-amber-800">⚠ {p.pendencia}</span>
							{/if}
							{#if p.aprovado > 0}
								<span class="border border-emerald-700 bg-emerald-50 px-1 py-px font-bold text-emerald-800">✓ {p.aprovado}</span>
							{/if}
							{#if p.rejeitado > 0}
								<span class="border border-red-700 bg-red-50 px-1 py-px font-bold text-red-800">✗ {p.rejeitado}</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
