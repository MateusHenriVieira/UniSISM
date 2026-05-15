<script lang="ts">
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import IngestoesBreadcrumb from '$lib/presentation/components/IngestoesBreadcrumb.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento, Ubs } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	/**
	 * Nível 1 · Arquivo de ingestões · lista de UBSs.
	 * Cada UBS é uma "pasta"; clique abre os anos com ingestões.
	 * Usa agregação client-side via GET /encaminhamentos + /admin/ubs.
	 * (Roadmap de backend: endpoint dedicado /encaminhamentos/arvore.)
	 */

	let ubsList = $state<Ubs[]>([]);
	let encs = $state<Encaminhamento[]>([]);
	let carregando = $state(true);

	onMount(async () => {
		try {
			const [ubs, listaEnc] = await Promise.all([
				api.admin.listUbs(),
				api.encaminhamentos.list({ limit: 1000 })
			]);
			ubsList = ubs;
			encs = listaEnc;
		} finally {
			carregando = false;
		}
	});

	interface AgregadoUbs {
		id: string;
		nome: string;
		ativa: boolean;
		total: number;
		aguardando: number;
		pendencia: number;
		aprovado: number;
		rejeitado: number;
		anoMaisRecente: number | null;
		ultimaAtividade: string | null;
	}

	/** Agregação cliente — se o backend expuser /encaminhamentos/arvore, substitui. */
	let pastas = $derived.by<AgregadoUbs[]>(() => {
		const m = new Map<string, AgregadoUbs>();
		for (const u of ubsList) {
			m.set(u.nome, {
				id: u.id,
				nome: u.nome,
				ativa: u.ativa,
				total: 0,
				aguardando: 0,
				pendencia: 0,
				aprovado: 0,
				rejeitado: 0,
				anoMaisRecente: null,
				ultimaAtividade: null
			});
		}
		for (const e of encs) {
			// Match pela unidadeOrigem (string). Se não houver UBS correspondente,
			// cria uma pasta "fantasma" só pra não perder o registro.
			let pasta = [...m.values()].find((p) => e.unidadeOrigem.includes(p.nome));
			if (!pasta) {
				pasta = {
					id: e.unidadeOrigem,
					nome: e.unidadeOrigem,
					ativa: false,
					total: 0,
					aguardando: 0,
					pendencia: 0,
					aprovado: 0,
					rejeitado: 0,
					anoMaisRecente: null,
					ultimaAtividade: null
				};
				m.set(e.unidadeOrigem, pasta);
			}
			pasta.total++;
			if (e.status === 'AGUARDANDO_REGULACAO') pasta.aguardando++;
			else if (e.status === 'PENDENCIA_DOCUMENTO') pasta.pendencia++;
			else if (e.status === 'APROVADO') pasta.aprovado++;
			else if (e.status === 'REJEITADO') pasta.rejeitado++;

			const ano = new Date(e.criadoEm).getFullYear();
			if (pasta.anoMaisRecente === null || ano > pasta.anoMaisRecente)
				pasta.anoMaisRecente = ano;
			if (!pasta.ultimaAtividade || e.criadoEm > pasta.ultimaAtividade)
				pasta.ultimaAtividade = e.criadoEm;
		}
		return [...m.values()]
			.filter((p) => p.total > 0 || p.ativa)
			.sort((a, b) => b.total - a.total);
	});

	let totalEncs = $derived(encs.length);
	let totalUbsAtivas = $derived(ubsList.filter((u) => u.ativa).length);
	let totalPendencias = $derived(pastas.reduce((a, p) => a + p.pendencia, 0));

	function ubsAtiva(p: AgregadoUbs): string {
		return p.ativa ? 'ATIVA' : 'SEM CADASTRO';
	}

	function formatarAtividade(iso: string | null): string {
		if (!iso) return '—';
		const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
		if (dias === 0) return 'hoje';
		if (dias === 1) return 'ontem';
		if (dias < 30) return `há ${dias}d`;
		if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
		return `há ${Math.floor(dias / 365)}a`;
	}
</script>

<div class="flex flex-col gap-4">
	<IngestoesBreadcrumb items={[{ label: 'Arquivo de Ingestões' }]} />

	<!-- KPIs globais -->
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard
			label="UBSs com Ingestões"
			value={carregando ? '—' : pastas.length}
			sublabel="Pastas disponíveis"
		/>
		<MetricCard
			label="Total de Encaminhamentos"
			value={carregando ? '—' : totalEncs}
			sublabel="Acumulado da prefeitura"
			accent="default"
		/>
		<MetricCard
			label="UBSs Ativas"
			value={carregando ? '—' : totalUbsAtivas}
			sublabel="Cadastradas na rede"
			accent="success"
		/>
		<MetricCard
			label="Pendências na Rede"
			value={carregando ? '—' : totalPendencias}
			sublabel="Aguardando readequação"
			accent="critical"
		/>
	</section>

	<!-- Grid de pastas (UBSs) -->
	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Selecione uma UBS"
			subtitle="Cada UBS abre a árvore Ano · Mês · Dia dos encaminhamentos enviados"
			index="01"
		>
			<span
				class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
			>
				{pastas.length} PASTAS
			</span>
		</PanelHeader>

		{#if carregando}
			<div class="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
				{#each Array(6) as _, i (i)}
					<div class="bg-white p-4">
						<div class="h-20 w-full animate-pulse bg-slate-100"></div>
					</div>
				{/each}
			</div>
		{:else if pastas.length === 0}
			<div class="px-4 py-12 text-center font-mono text-xs text-slate-500">
				Nenhuma UBS com ingestões registradas.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">
				{#each pastas as p (p.id)}
					<button
						type="button"
						onclick={() => goto(`/sms/ingestoes/${encodeURIComponent(p.id)}`)}
						class="group flex items-start gap-3 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
					>
						<!-- Ícone de pasta -->
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center border border-slate-300 bg-slate-50 transition-colors group-hover:border-blue-900 group-hover:bg-blue-50"
						>
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
						</div>

						<div class="flex-1 leading-tight">
							<div class="flex items-center justify-between gap-2">
								<div class="font-mono text-xs font-bold tracking-wider text-slate-900 uppercase">
									{p.nome}
								</div>
								<span
									class="border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-slate-600 uppercase"
								>
									{ubsAtiva(p)}
								</span>
							</div>

							<div class="mt-1.5 flex items-baseline gap-2">
								<span class="font-mono text-2xl font-bold text-slate-900">{p.total}</span>
								<span class="font-mono text-[10px] tracking-wider text-slate-500 uppercase">
									encaminhamento{p.total === 1 ? '' : 's'}
								</span>
							</div>

							<div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
								{#if p.aguardando > 0}
									<span
										class="border border-blue-700 bg-blue-50 px-1 py-px font-bold text-blue-900"
									>
										⏱ {p.aguardando}
									</span>
								{/if}
								{#if p.pendencia > 0}
									<span
										class="border border-amber-600 bg-amber-50 px-1 py-px font-bold text-amber-800"
									>
										⚠ {p.pendencia}
									</span>
								{/if}
								{#if p.aprovado > 0}
									<span
										class="border border-emerald-700 bg-emerald-50 px-1 py-px font-bold text-emerald-800"
									>
										✓ {p.aprovado}
									</span>
								{/if}
								{#if p.rejeitado > 0}
									<span
										class="border border-red-700 bg-red-50 px-1 py-px font-bold text-red-800"
									>
										✗ {p.rejeitado}
									</span>
								{/if}
							</div>

							<div class="mt-1.5 flex items-center justify-between text-[10px]">
								<span class="font-mono tracking-wider text-slate-500 uppercase">
									ano mais recente: {p.anoMaisRecente ?? '—'}
								</span>
								<span class="font-mono tracking-wider text-slate-500 uppercase">
									{formatarAtividade(p.ultimaAtividade)}
								</span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-[11px] text-slate-600">
		<span class="font-bold tracking-widest text-slate-700 uppercase">Navegação:</span>
		UBS → Ano → Mês → Dia → Encaminhamentos. Cada nível mostra contadores por status da mesma forma.
	</div>
</div>
