<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import { usePaciente } from '$lib/presentation/contexts/pacienteContext';

	const ctx = usePaciente();
	let p = $derived(ctx.paciente!);

	function formatarData(iso: string) {
		return new Date(iso).toLocaleDateString('pt-BR');
	}

	const gravidadeTone = {
		LEVE: 'border-slate-400 bg-slate-50 text-slate-700',
		MODERADA: 'border-amber-600 bg-amber-50 text-amber-800',
		GRAVE: 'border-red-700 bg-red-50 text-red-800'
	} as const;

	const tipoAlergiaLabel = {
		MEDICAMENTO: 'Medicamento',
		ALIMENTO: 'Alimento',
		AMBIENTAL: 'Ambiental',
		OUTRO: 'Outro'
	} as const;

	let ativas = $derived(p.condicoesCronicas.filter((c) => c.ativo));
	let medsAtivos = $derived(p.medicamentosEmUso.filter((m) => m.ativo));
</script>

<section class="grid grid-cols-12 gap-4">
	<!-- Alergias (crítico) -->
	<div class="col-span-12 border-2 border-red-700 bg-white">
		<PanelHeader
			title="⚠ Alergias"
			subtitle="Verificar antes de prescrever ou administrar medicamentos"
			index="01"
		>
			<span
				class="border border-red-700 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-red-800 uppercase"
			>
				{p.alergias.length} REGISTRO{p.alergias.length === 1 ? '' : 'S'}
			</span>
		</PanelHeader>
		{#if p.alergias.length === 0}
			<div class="px-4 py-6 text-center font-mono text-xs text-slate-500">
				Nenhuma alergia registrada.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2">
				{#each p.alergias as a (a.substancia)}
					<div class="flex items-start justify-between gap-3 bg-white px-4 py-3">
						<div class="min-w-0 flex-1">
							<div class="text-sm font-bold text-slate-900">{a.substancia}</div>
							<div class="font-mono text-[11px] tracking-wider text-slate-600 uppercase">
								{tipoAlergiaLabel[a.tipo]}
							</div>
							{#if a.observacao}
								<div class="mt-1 text-xs text-slate-700">{a.observacao}</div>
							{/if}
						</div>
						<span
							class="shrink-0 border px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase {gravidadeTone[
								a.gravidade
							]}"
						>
							{a.gravidade}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Condições -->
	<div class="col-span-12 border border-slate-200 bg-white xl:col-span-8">
		<PanelHeader title="Condições Crônicas" index="02">
			<span
				class="border border-amber-600 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-800 uppercase"
			>
				{ativas.length} ATIVA{ativas.length === 1 ? '' : 'S'}
			</span>
		</PanelHeader>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
					>
						<th class="border-r border-slate-200 px-3 py-2">CID-10</th>
						<th class="border-r border-slate-200 px-3 py-2">Descrição</th>
						<th class="border-r border-slate-200 px-3 py-2">Desde</th>
						<th class="px-3 py-2">Status</th>
					</tr>
				</thead>
				<tbody class="font-mono">
					{#if p.condicoesCronicas.length === 0}
						<tr>
							<td colspan="4" class="px-3 py-6 text-center text-slate-500">
								Nenhuma condição registrada.
							</td>
						</tr>
					{:else}
						{#each p.condicoesCronicas as c (c.cid10)}
							<tr class="border-b border-slate-100">
								<td class="border-r border-slate-100 px-3 py-2 font-bold text-blue-900">
									{c.cid10}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
									{c.descricao}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{formatarData(c.desde)}
								</td>
								<td class="px-3 py-2">
									{#if c.ativo}
										<span
											class="border border-amber-600 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-amber-800 uppercase"
										>
											ATIVA
										</span>
									{:else}
										<span
											class="border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-600 uppercase"
										>
											ENCERRADA
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Histórico familiar -->
	<div class="col-span-12 border border-slate-200 bg-white xl:col-span-4">
		<PanelHeader title="Histórico Familiar" index="03" />
		<ul class="divide-y divide-slate-100 text-xs">
			{#if p.historicoFamiliar.length === 0}
				<li class="px-4 py-4 text-center font-mono text-slate-500">Nenhum registro.</li>
			{:else}
				{#each p.historicoFamiliar as h, i (i)}
					<li class="px-4 py-2.5 text-slate-800">{h}</li>
				{/each}
			{/if}
		</ul>
	</div>

	<!-- Medicamentos -->
	<div class="col-span-12 border border-slate-200 bg-white">
		<PanelHeader title="Medicamentos" index="04">
			<span
				class="border border-emerald-700 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-emerald-800 uppercase"
			>
				{medsAtivos.length} EM USO
			</span>
		</PanelHeader>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
					>
						<th class="border-r border-slate-200 px-3 py-2">Medicamento</th>
						<th class="border-r border-slate-200 px-3 py-2">Dosagem</th>
						<th class="border-r border-slate-200 px-3 py-2">Posologia</th>
						<th class="border-r border-slate-200 px-3 py-2">Prescritor</th>
						<th class="border-r border-slate-200 px-3 py-2">Desde</th>
						<th class="px-3 py-2">Status</th>
					</tr>
				</thead>
				<tbody class="font-mono">
					{#if p.medicamentosEmUso.length === 0}
						<tr>
							<td colspan="6" class="px-3 py-6 text-center text-slate-500">
								Nenhum medicamento registrado.
							</td>
						</tr>
					{:else}
						{#each p.medicamentosEmUso as m, i (m.nome + i)}
							<tr class="border-b border-slate-100">
								<td class="border-r border-slate-100 px-3 py-2 font-sans font-bold text-slate-900">
									{m.nome}
								</td>
								<td class="border-r border-slate-100 px-3 py-2">{m.dosagem}</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
									{m.frequencia}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
									{m.prescritor}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-600">
									{formatarData(m.desde)}
								</td>
								<td class="px-3 py-2">
									{#if m.ativo}
										<span
											class="border border-emerald-700 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800"
										>
											ATIVO
										</span>
									{:else}
										<span
											class="border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
										>
											SUSPENSO
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</section>
