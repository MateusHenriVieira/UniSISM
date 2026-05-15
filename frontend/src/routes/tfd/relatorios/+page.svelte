<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { api } from '$lib/api';
	import { mensagemErroTfd } from '$lib/api/erros-tfd';
	import { formatarBRL, mesAtual } from '$lib/presentation/utils/tfdFormat';
	import type {
		Abastecimento,
		AjudaCusto,
		Motorista,
		SaldoVeiculo,
		Veiculo,
		ViagemFrota
	} from '$lib/api/tfd-types';
	import { onMount } from 'svelte';

	let viagens = $state<ViagemFrota[]>([]);
	let veiculos = $state<Veiculo[]>([]);
	let motoristas = $state<Motorista[]>([]);
	let abastecimentos = $state<Abastecimento[]>([]);
	let ajudas = $state<AjudaCusto[]>([]);
	let saldos = $state<SaldoVeiculo[]>([]);

	let carregando = $state(true);
	let erroLista = $state<string | null>(null);

	async function carregar() {
		carregando = true;
		erroLista = null;
		try {
			const [vs, vehs, ms, abs, ajs, sl] = await Promise.all([
				api.tfd.viagens.list(),
				api.tfd.veiculos.list(),
				api.tfd.motoristas.list(),
				api.tfd.abastecimentos.list(),
				api.tfd.ajudasCusto.list(),
				api.tfd.saldo.list(mesAtual())
			]);
			viagens = vs;
			veiculos = vehs;
			motoristas = ms;
			abastecimentos = abs;
			ajudas = ajs;
			saldos = sl;
		} catch (e) {
			erroLista = mensagemErroTfd(e);
		} finally {
			carregando = false;
		}
	}

	onMount(carregar);

	// Consumo por veículo
	const consumoPorVeiculo = $derived(
		veiculos.map((v) => {
			const abts = abastecimentos.filter((a) => a.veiculoId === v.id && a.status === 'REALIZADO');
			const litros = abts.reduce((acc, a) => acc + a.litros, 0);
			const valor = abts.reduce((acc, a) => acc + a.valorTotal, 0);
			const consumosValidos = abts.filter((a) => a.consumoCalcKml !== null);
			const consumo =
				consumosValidos.length > 0
					? consumosValidos.reduce((acc, a) => acc + (a.consumoCalcKml ?? 0), 0) /
						consumosValidos.length
					: 0;
			return {
				veiculo: v,
				abastecimentos: abts.length,
				litros,
				valor,
				consumo
			};
		})
	);

	// Faltas por paciente (a partir das viagens)
	interface FaltaItem {
		pacienteId: string;
		pacienteNome: string;
		faltas: number;
		totalViagens: number;
	}
	const faltasPorPaciente = $derived.by(() => {
		const map = new Map<string, FaltaItem>();
		viagens.forEach((v) =>
			v.passageiros.forEach((p) => {
				const cur = map.get(p.pacienteId) ?? {
					pacienteId: p.pacienteId,
					pacienteNome: p.pacienteNome ?? '—',
					faltas: 0,
					totalViagens: 0
				};
				cur.totalViagens += 1;
				if (p.presenca === 'AUSENTE') cur.faltas += 1;
				map.set(p.pacienteId, cur);
			})
		);
		return Array.from(map.values()).sort((a, b) => b.faltas - a.faltas);
	});

	// Produção dos motoristas
	const producaoMotoristas = $derived(
		motoristas.map((m) => {
			const vs = viagens.filter((v) => v.motoristaId === m.id);
			const concluidas = vs.filter((v) => v.status === 'CONCLUIDA').length;
			return {
				motorista: m,
				totalViagens: vs.length,
				concluidas
			};
		})
	);

	const totalGastoCombustivel = $derived(
		abastecimentos.filter((a) => a.status === 'REALIZADO').reduce((acc, a) => acc + a.valorTotal, 0)
	);
	const totalPagoAjudas = $derived(
		ajudas.filter((a) => a.status === 'PAGA').reduce((acc, a) => acc + a.valorTotal, 0)
	);
	const totalSaldoConsumido = $derived(saldos.reduce((acc, s) => acc + s.saldoConsumido, 0));
	const viagensConcluidas = $derived(viagens.filter((v) => v.status === 'CONCLUIDA').length);
</script>

<div class="flex flex-col gap-4">
	{#if erroLista}
		<div
			class="border border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
		>
			⚠ {erroLista}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard
			label="Viagens Realizadas"
			value={carregando ? '—' : viagensConcluidas}
			sublabel="No mês"
		/>
		<MetricCard
			label="Combustível"
			value={carregando ? '—' : formatarBRL(totalGastoCombustivel)}
			sublabel={`Saldo consumido: ${formatarBRL(totalSaldoConsumido)}`}
		/>
		<MetricCard
			label="Ajudas de Custo"
			value={carregando ? '—' : formatarBRL(totalPagoAjudas)}
			sublabel="Repasses pagos"
		/>
		<MetricCard
			label="Faltas Totais"
			value={carregando ? '—' : faltasPorPaciente.reduce((acc, x) => acc + x.faltas, 0)}
			sublabel="Pacientes ausentes"
			accent="critical"
		/>
	</div>

	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Consumo por Veículo"
			subtitle="Litros, gasto e km/L médio · prestação de contas"
			index="01"
		/>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs">
				<thead>
					<tr
						class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
					>
						<th class="border-r border-slate-200 px-3 py-2">Placa</th>
						<th class="border-r border-slate-200 px-3 py-2">Modelo</th>
						<th class="border-r border-slate-200 px-3 py-2">Abasts.</th>
						<th class="border-r border-slate-200 px-3 py-2">Litros</th>
						<th class="border-r border-slate-200 px-3 py-2">Valor</th>
						<th class="px-3 py-2">Consumo</th>
					</tr>
				</thead>
				<tbody class="font-mono">
					{#if carregando}
						{#each Array(3) as _, i (i)}
							<tr class="border-b border-slate-100">
								<td colspan="6" class="px-3 py-3">
									<div class="h-3 w-full animate-pulse bg-slate-100"></div>
								</td>
							</tr>
						{/each}
					{:else}
						{#each consumoPorVeiculo as c (c.veiculo.id)}
							<tr class="border-b border-slate-100">
								<td class="border-r border-slate-100 px-3 py-2 font-bold text-blue-900">
									{c.veiculo.placa}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
									{c.veiculo.modelo}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700"
									>{c.abastecimentos}</td
								>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{c.litros.toFixed(1)} L
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{formatarBRL(c.valor)}
								</td>
								<td class="px-3 py-2 text-slate-700">
									{c.consumo > 0 ? c.consumo.toFixed(1) + ' km/L' : '—'}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="grid grid-cols-12 gap-4">
		<div class="col-span-12 border border-slate-200 bg-white xl:col-span-6">
			<PanelHeader
				title="Faltas por Paciente"
				subtitle="Reincidência · pode justificar bloqueio operacional"
				index="02"
			/>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-xs">
					<thead>
						<tr
							class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
						>
							<th class="border-r border-slate-200 px-3 py-2">Paciente</th>
							<th class="border-r border-slate-200 px-3 py-2">Faltas</th>
							<th class="border-r border-slate-200 px-3 py-2">Viagens</th>
							<th class="px-3 py-2">% Falta</th>
						</tr>
					</thead>
					<tbody class="font-mono">
						{#if !carregando && faltasPorPaciente.length === 0}
							<tr>
								<td colspan="4" class="px-3 py-6 text-center font-sans text-sm text-slate-500">
									Nenhuma viagem registrada com presença ainda.
								</td>
							</tr>
						{:else}
							{#each faltasPorPaciente as f (f.pacienteId)}
								{@const pct = f.totalViagens > 0 ? (f.faltas / f.totalViagens) * 100 : 0}
								<tr class="border-b border-slate-100">
									<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
										{f.pacienteNome}
									</td>
									<td class="border-r border-slate-100 px-3 py-2 font-bold text-red-700">
										{f.faltas}
									</td>
									<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
										{f.totalViagens}
									</td>
									<td class="px-3 py-2">
										<span
											class="border px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase
												{pct >= 50
												? 'border-red-700 bg-red-50 text-red-800'
												: pct >= 20
													? 'border-amber-600 bg-amber-50 text-amber-800'
													: 'border-emerald-700 bg-emerald-50 text-emerald-800'}"
										>
											{pct.toFixed(0)}%
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div class="col-span-12 border border-slate-200 bg-white xl:col-span-6">
			<PanelHeader
				title="Produção por Motorista"
				subtitle="Viagens lançadas e concluídas"
				index="03"
			/>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-xs">
					<thead>
						<tr
							class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
						>
							<th class="border-r border-slate-200 px-3 py-2">Motorista</th>
							<th class="border-r border-slate-200 px-3 py-2">Viagens</th>
							<th class="border-r border-slate-200 px-3 py-2">Concluídas</th>
							<th class="px-3 py-2">KM Histórico</th>
						</tr>
					</thead>
					<tbody class="font-mono">
						{#each producaoMotoristas as p (p.motorista.id)}
							<tr class="border-b border-slate-100">
								<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-900">
									{p.motorista.nome}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
									{p.totalViagens}
								</td>
								<td class="border-r border-slate-100 px-3 py-2 text-emerald-700">
									{p.concluidas}
								</td>
								<td class="px-3 py-2 text-slate-700">
									{p.motorista.totalKmRodados.toLocaleString('pt-BR')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<div class="border-2 border-blue-900 bg-blue-50 p-4 font-sans text-[12px] text-blue-900">
		<div class="font-mono text-[11px] font-bold tracking-widest uppercase">
			Prestação de Contas · Tribunal de Justiça
		</div>
		<p class="mt-1">
			Para gerar o relatório consolidado mensal exigido pelo TJ (com hash blockchain-like encadeado
			de toda operação), use o módulo de
			<a href="/tfd/auditoria" class="font-bold underline">Auditoria</a> e exporte o ZIP do mês.
		</p>
	</div>
</div>
