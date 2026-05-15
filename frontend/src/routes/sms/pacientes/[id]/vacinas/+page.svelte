<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { usePaciente } from '$lib/presentation/contexts/pacienteContext';
	import type { VacinaAplicada } from '$lib/api/types';

	const ctx = usePaciente();
	let p = $derived(ctx.paciente!);

	const viaLabel: Record<VacinaAplicada['via'], string> = {
		INTRAMUSCULAR: 'IM',
		SUBCUTANEA: 'SC',
		ORAL: 'VO',
		INTRADERMICA: 'ID'
	};

	function formatarData(iso: string) {
		return new Date(iso).toLocaleDateString('pt-BR');
	}

	function diasDesde(iso: string): number {
		return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
	}

	let noUltimoAno = $derived(p.vacinacoes.filter((v) => diasDesde(v.data) < 365).length);
	let vacinasDistintas = $derived(new Set(p.vacinacoes.map((v) => v.vacina)).size);
	let ultimaDose = $derived(p.vacinacoes[0]);
</script>

<div class="flex flex-col gap-4">
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard label="Doses Aplicadas" value={p.vacinacoes.length} sublabel="Histórico" />
		<MetricCard label="Imunobiológicos" value={vacinasDistintas} sublabel="Tipos distintos" />
		<MetricCard label="No Último Ano" value={noUltimoAno} sublabel="Últimos 365 dias" />
		<MetricCard
			label="Última Aplicação"
			value={ultimaDose ? formatarData(ultimaDose.data) : '—'}
			sublabel={ultimaDose ? `há ${diasDesde(ultimaDose.data)} dias` : 'Nenhuma'}
		/>
	</section>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Caderneta de Vacinação"
			subtitle="Doses aplicadas na rede municipal"
			index="01"
		>
			<span
				class="border border-emerald-700 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-emerald-800 uppercase"
			>
				CADERNETA ATIVA
			</span>
		</PanelHeader>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
					>
						<th class="border-r border-slate-200 px-3 py-2">Data</th>
						<th class="border-r border-slate-200 px-3 py-2">Vacina</th>
						<th class="border-r border-slate-200 px-3 py-2">Dose</th>
						<th class="border-r border-slate-200 px-3 py-2">Via</th>
						<th class="border-r border-slate-200 px-3 py-2">Lote</th>
						<th class="border-r border-slate-200 px-3 py-2">Aplicador</th>
						<th class="px-3 py-2">Unidade</th>
					</tr>
				</thead>
				<tbody class="font-mono">
					{#if p.vacinacoes.length === 0}
						<tr>
							<td colspan="7" class="px-3 py-8 text-center font-sans text-sm text-slate-500">
								Nenhuma vacina aplicada.
							</td>
						</tr>
					{:else}
						{#each p.vacinacoes as v (v.id)}
							<tr class="border-b border-slate-100 hover:bg-slate-50">
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{formatarData(v.data)}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans font-bold text-slate-900">
									{v.vacina}
								</td>
								<td class="border-r border-slate-100 px-3 py-2">
									<span
										class="border border-blue-900 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-900 uppercase"
									>
										{v.dose}
									</span>
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-center text-slate-700">
									{viaLabel[v.via]}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-600">
									{v.lote}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
									{v.aplicador}
								</td>
								<td class="px-3 py-2 font-sans text-slate-600">{v.unidade}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
