<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import { api } from '$lib/api';
	import { mensagemErroTfd } from '$lib/api/erros-tfd';
	import { formatarData } from '$lib/presentation/utils/tfdFormat';
	import type { SolicitacaoTFD, StatusSolicitacaoTFD } from '$lib/api/tfd-types';
	import { onMount } from 'svelte';

	let lista = $state<SolicitacaoTFD[]>([]);
	let carregando = $state(true);
	let erro = $state<string | null>(null);
	let filtroStatus = $state<'TODOS' | StatusSolicitacaoTFD>('PENDENTE');

	const filtros: Array<'TODOS' | StatusSolicitacaoTFD> = [
		'TODOS',
		'PENDENTE',
		'APROVADA',
		'ALOCADA',
		'REALIZADA',
		'NEGADA'
	];

	const statusTone: Record<StatusSolicitacaoTFD, string> = {
		PENDENTE: 'border-amber-600 bg-amber-50 text-amber-800',
		APROVADA: 'border-blue-700 bg-blue-50 text-blue-900',
		ALOCADA: 'border-emerald-700 bg-emerald-50 text-emerald-800',
		REALIZADA: 'border-slate-700 bg-slate-100 text-slate-800',
		NEGADA: 'border-red-700 bg-red-50 text-red-800',
		CANCELADA: 'border-slate-300 bg-slate-50 text-slate-600'
	};

	async function carregar() {
		carregando = true;
		erro = null;
		try {
			lista = await api.tfd.solicitacoes.list(
				filtroStatus === 'TODOS' ? undefined : { status: filtroStatus }
			);
		} catch (e) {
			erro = mensagemErroTfd(e);
		} finally {
			carregando = false;
		}
	}

	$effect(() => {
		// recarrega ao mudar o filtro (filtroStatus é dependência reativa)
		void filtroStatus;
		carregar();
	});

	onMount(carregar);
</script>

<div class="border border-slate-200 bg-white">
	<PanelHeader
		title="Solicitações de Viagem"
		subtitle="Pedidos originados de pacientes/UBSs · gestão central"
		index="01"
	>
		<span
			class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
		>
			{lista.length} REGISTROS
		</span>
	</PanelHeader>

	<div class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
		<span class="mr-2 font-mono text-[10px] font-bold tracking-widest text-slate-600 uppercase">
			Status
		</span>
		{#each filtros as f (f)}
			<button
				type="button"
				onclick={() => (filtroStatus = f)}
				class="border px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors
					{filtroStatus === f
					? 'border-blue-900 bg-blue-900 text-white'
					: 'border-slate-300 bg-white text-slate-700 hover:border-blue-900 hover:text-blue-900'}"
			>
				{f}
			</button>
		{/each}
	</div>

	{#if erro}
		<div
			class="border-b border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
		>
			⚠ {erro}
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr
					class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
				>
					<th class="border-r border-slate-200 px-3 py-2">Protocolo</th>
					<th class="border-r border-slate-200 px-3 py-2">Paciente</th>
					<th class="border-r border-slate-200 px-3 py-2">Destino</th>
					<th class="border-r border-slate-200 px-3 py-2">Especialidade</th>
					<th class="border-r border-slate-200 px-3 py-2">Data</th>
					<th class="px-3 py-2">Status</th>
				</tr>
			</thead>
			<tbody class="font-mono">
				{#if carregando}
					{#each Array(4) as _, i (i)}
						<tr class="border-b border-slate-100">
							<td colspan="6" class="px-3 py-3">
								<div class="h-3 w-full animate-pulse bg-slate-100"></div>
							</td>
						</tr>
					{/each}
				{:else if lista.length === 0}
					<tr>
						<td colspan="6" class="px-3 py-12 text-center font-sans text-sm text-slate-500">
							Nenhuma solicitação com o filtro selecionado.
						</td>
					</tr>
				{:else}
					{#each lista as s (s.id)}
						<tr class="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
							<td
								class="border-r border-slate-100 px-3 py-2 font-bold text-blue-900 underline decoration-blue-900/30 underline-offset-2"
							>
								<a href="/tfd/solicitacoes/{s.id}">{s.protocolo}</a>
							</td>
							<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
								{s.pacienteNome ?? '—'}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
								{s.destino}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
								{s.especialidade}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
								{formatarData(s.dataDesejada)}
							</td>
							<td class="px-3 py-2">
								<span
									class="border px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase {statusTone[
										s.status
									]}"
								>
									{s.status}
								</span>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
