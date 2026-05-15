<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';
	import PrimaryButton from './PrimaryButton.svelte';
	import PanelHeader from './PanelHeader.svelte';
	import type { Encaminhamento } from '$lib/domain/models/Encaminhamento';
	import { goto } from '$app/navigation';

	interface Props {
		titulo: string;
		subtitulo?: string;
		lista: Encaminhamento[];
		carregando: boolean;
		mostrarStatus?: boolean;
		/**
		 * Caminho-base para a navegação do detalhe ao clicar na linha.
		 * Default `/ubs/encaminhamento` (Face 1). Na Face 2 usar `/sms/encaminhamento`.
		 */
		detalheBasePath?: string;
	}

	let {
		titulo,
		subtitulo = '',
		lista,
		carregando,
		mostrarStatus = true,
		detalheBasePath = '/ubs/encaminhamento'
	}: Props = $props();

	let busca = $state('');

	let filtrada = $derived(
		busca
			? lista.filter((e) => {
					const q = busca.toLowerCase();
					return (
						e.paciente.nome.toLowerCase().includes(q) ||
						e.paciente.cpf.includes(busca) ||
						e.protocolo.toLowerCase().includes(q) ||
						e.solicitacao.especialidadeSolicitada.toLowerCase().includes(q) ||
						e.solicitacao.cid10.toLowerCase().includes(q)
					);
				})
			: lista
	);

	function formatarData(iso: string): string {
		return new Date(iso).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="border border-slate-200 bg-white">
	<PanelHeader title={titulo} subtitle={subtitulo} index="01">
		<span
			class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
		>
			{filtrada.length} / {lista.length} REGISTROS
		</span>
	</PanelHeader>

	<div class="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
		<label
			for="busca"
			class="font-mono text-[10px] font-bold tracking-widest text-slate-600 uppercase"
		>
			Buscar
		</label>
		<input
			id="busca"
			type="text"
			bind:value={busca}
			placeholder="Nome, CPF, protocolo, CID-10, especialidade..."
			class="flex-1 border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
		/>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr
					class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
				>
					<th class="border-r border-slate-200 px-3 py-2">Criado em</th>
					<th class="border-r border-slate-200 px-3 py-2">Protocolo</th>
					<th class="border-r border-slate-200 px-3 py-2">Paciente</th>
					<th class="border-r border-slate-200 px-3 py-2">CPF</th>
					<th class="border-r border-slate-200 px-3 py-2">Especialidade</th>
					<th class="border-r border-slate-200 px-3 py-2">CID-10</th>
					<th class="border-r border-slate-200 px-3 py-2">Prioridade</th>
					{#if mostrarStatus}
						<th class="border-r border-slate-200 px-3 py-2">Status</th>
					{/if}
					<th class="px-3 py-2">Ação</th>
				</tr>
			</thead>
			<tbody class="font-mono">
				{#if carregando}
					{#each Array(6) as _, i (i)}
						<tr class="border-b border-slate-100">
							<td colspan={mostrarStatus ? 9 : 8} class="px-3 py-3">
								<div class="h-3 w-full animate-pulse bg-slate-100"></div>
							</td>
						</tr>
					{/each}
				{:else if filtrada.length === 0}
					<tr>
						<td
							colspan={mostrarStatus ? 9 : 8}
							class="px-3 py-12 text-center font-sans text-sm text-slate-500"
						>
							Nenhum encaminhamento encontrado.
						</td>
					</tr>
				{:else}
					{#each filtrada as e (e.id)}
						<tr
							class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
							onclick={() => goto(`${detalheBasePath}/${e.id}`)}
						>
							<td class="border-r border-slate-100 px-3 py-2 text-slate-600">
								{formatarData(e.criadoEm)}
							</td>
							<td
								class="border-r border-slate-100 px-3 py-2 font-bold text-blue-900 underline decoration-blue-900/30 underline-offset-2"
							>
								{e.protocolo}
							</td>
							<td
								class="border-r border-slate-100 px-3 py-2 font-sans font-semibold text-slate-900"
							>
								{e.paciente.nome}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
								{e.paciente.cpf}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
								{e.solicitacao.especialidadeSolicitada}
							</td>
							<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
								{e.solicitacao.cid10}
							</td>
							<td class="border-r border-slate-100 px-3 py-2">
								<StatusBadge prioridade={e.solicitacao.prioridade} />
							</td>
							{#if mostrarStatus}
								<td class="border-r border-slate-100 px-3 py-2">
									<StatusBadge status={e.status} />
								</td>
							{/if}
							<td class="px-3 py-2" onclick={(ev) => ev.stopPropagation()}>
								<PrimaryButton
									label="Abrir"
									variant="secondary"
									onclick={() => goto(`${detalheBasePath}/${e.id}`)}
								/>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
