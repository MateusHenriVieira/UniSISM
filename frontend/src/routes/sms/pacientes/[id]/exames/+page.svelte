<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { usePaciente } from '$lib/presentation/contexts/pacienteContext';
	import type { ExameRealizado, ResultadoExame } from '$lib/api/types';

	const ctx = usePaciente();
	let p = $derived(ctx.paciente!);

	const resultadoTone: Record<ResultadoExame, string> = {
		NORMAL: 'border-emerald-700 bg-emerald-50 text-emerald-800',
		ALTERADO: 'border-amber-600 bg-amber-50 text-amber-800',
		CRITICO: 'border-red-700 bg-red-50 text-red-800',
		PENDENTE: 'border-slate-400 bg-slate-50 text-slate-700'
	};

	const categoriaTone: Record<ExameRealizado['categoria'], string> = {
		LABORATORIAL: 'border-blue-700 bg-blue-50 text-blue-900',
		IMAGEM: 'border-purple-700 bg-purple-50 text-purple-800',
		FUNCIONAL: 'border-sky-700 bg-sky-50 text-sky-800',
		OUTROS: 'border-slate-400 bg-slate-50 text-slate-700'
	};

	function formatarData(iso: string) {
		return new Date(iso).toLocaleDateString('pt-BR');
	}

	let normais = $derived(p.exames.filter((e) => e.resultado === 'NORMAL').length);
	let alterados = $derived(p.exames.filter((e) => e.resultado === 'ALTERADO').length);
	let criticos = $derived(p.exames.filter((e) => e.resultado === 'CRITICO').length);
</script>

<div class="flex flex-col gap-4">
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard label="Total de Exames" value={p.exames.length} sublabel="Histórico completo" />
		<MetricCard label="Normais" value={normais} sublabel="Sem alterações" accent="success" />
		<MetricCard label="Alterados" value={alterados} sublabel="Acompanhar" accent="warning" />
		<MetricCard label="Críticos" value={criticos} sublabel="Ação imediata" accent="critical" />
	</section>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Histórico de Exames"
			subtitle="Laboratoriais, imagem e funcionais"
			index="01"
		/>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
					>
						<th class="border-r border-slate-200 px-3 py-2">Data</th>
						<th class="border-r border-slate-200 px-3 py-2">Exame</th>
						<th class="border-r border-slate-200 px-3 py-2">Categoria</th>
						<th class="border-r border-slate-200 px-3 py-2">Solicitante</th>
						<th class="border-r border-slate-200 px-3 py-2">Executor</th>
						<th class="px-3 py-2">Resultado</th>
					</tr>
				</thead>
				<tbody class="font-mono">
					{#if p.exames.length === 0}
						<tr>
							<td colspan="6" class="px-3 py-8 text-center font-sans text-sm text-slate-500">
								Nenhum exame registrado.
							</td>
						</tr>
					{:else}
						{#each p.exames as e (e.id)}
							<tr class="border-b border-slate-100 hover:bg-slate-50">
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{formatarData(e.data)}
								</td>
								<td class="border-r border-slate-100 px-3 py-2">
									<div class="font-sans font-bold text-slate-900">{e.tipo}</div>
									{#if e.observacao}
										<div class="mt-0.5 font-sans text-[11px] text-slate-600">
											{e.observacao}
										</div>
									{/if}
								</td>
								<td class="border-r border-slate-100 px-3 py-2">
									<span
										class="border px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase {categoriaTone[
											e.categoria
										]}"
									>
										{e.categoria}
									</span>
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
									{e.solicitante}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-600">
									{e.unidadeExecutora}
								</td>
								<td class="px-3 py-2">
									<span
										class="border px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase {resultadoTone[
											e.resultado
										]}"
									>
										{e.resultado}
									</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
