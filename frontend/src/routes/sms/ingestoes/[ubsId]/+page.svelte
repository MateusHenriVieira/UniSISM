<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import IngestoesBreadcrumb from '$lib/presentation/components/IngestoesBreadcrumb.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento, Ubs } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let ubsId = $derived(decodeURIComponent(page.params.ubsId ?? ''));
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
			// Filtra por unidade quando o id é um uuid real de UBS; senão
			// trata como "nome da unidade" (fallback pro caso sem cadastro).
			encs = listaEnc.filter((e) =>
				ubsMatch ? e.unidadeOrigem.includes(ubsMatch.nome) : e.unidadeOrigem === ubsId
			);
		} finally {
			carregando = false;
		}
	});

	let nomeUbs = $derived(ubs?.nome ?? ubsId);

	interface PastaAno {
		ano: number;
		total: number;
		aguardando: number;
		pendencia: number;
		aprovado: number;
		rejeitado: number;
	}

	let pastas = $derived.by<PastaAno[]>(() => {
		const m = new Map<number, PastaAno>();
		for (const e of encs) {
			const ano = new Date(e.criadoEm).getFullYear();
			const prev =
				m.get(ano) ??
				({
					ano,
					total: 0,
					aguardando: 0,
					pendencia: 0,
					aprovado: 0,
					rejeitado: 0
				} satisfies PastaAno);
			prev.total++;
			if (e.status === 'AGUARDANDO_REGULACAO') prev.aguardando++;
			else if (e.status === 'PENDENCIA_DOCUMENTO') prev.pendencia++;
			else if (e.status === 'APROVADO') prev.aprovado++;
			else if (e.status === 'REJEITADO') prev.rejeitado++;
			m.set(ano, prev);
		}
		return [...m.values()].sort((a, b) => b.ano - a.ano);
	});
</script>

<div class="flex flex-col gap-4">
	<IngestoesBreadcrumb
		items={[
			{ label: 'Arquivo', href: '/sms/ingestoes' },
			{ label: nomeUbs }
		]}
	/>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title={`UBS · ${nomeUbs}`}
			subtitle="Selecione o ano para ver os meses"
			index="01"
		>
			<span
				class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
			>
				{pastas.length} ANO{pastas.length === 1 ? '' : 'S'}
			</span>
		</PanelHeader>

		{#if carregando}
			<div class="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<div class="bg-white p-4">
						<div class="h-24 w-full animate-pulse bg-slate-100"></div>
					</div>
				{/each}
			</div>
		{:else if pastas.length === 0}
			<div class="px-4 py-12 text-center font-mono text-xs text-slate-500">
				Nenhum encaminhamento desta UBS.
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4 xl:grid-cols-6">
				{#each pastas as p (p.ano)}
					<button
						type="button"
						onclick={() =>
							goto(`/sms/ingestoes/${encodeURIComponent(ubsId)}/${p.ano}`)}
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
									d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
								/>
							</svg>
							<div class="font-mono text-3xl font-bold text-slate-900 group-hover:text-blue-900">
								{p.ano}
							</div>
						</div>
						<div class="mt-2 font-mono text-xs font-bold text-slate-900">
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
