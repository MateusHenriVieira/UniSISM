<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import PrimaryButton from '$lib/presentation/components/PrimaryButton.svelte';
	import { api } from '$lib/api';
	import { mensagemErroTfd } from '$lib/api/erros-tfd';
	import { formatarCpf, formatarData } from '$lib/presentation/utils/tfdFormat';
	import type { Motorista, ViagemFrota } from '$lib/api/tfd-types';
	import { useAuth } from '$lib/presentation/contexts/authContext';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const auth = useAuth();
	let podeOperar = $derived(!!auth.podeGerenciarTFD);

	const id = $derived(page.params.id ?? '');

	let m = $state<Motorista | null>(null);
	let viagens = $state<ViagemFrota[]>([]);
	let carregando = $state(true);
	let erro = $state<string | null>(null);
	let mensagem = $state<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

	function notificar(tipo: 'ok' | 'erro', texto: string) {
		mensagem = { tipo, texto };
		setTimeout(() => (mensagem = null), 4000);
	}

	const concluidas = $derived(viagens.filter((v) => v.status === 'CONCLUIDA').length);

	async function carregar() {
		if (!id) return;
		carregando = true;
		erro = null;
		try {
			const [mot, vgs] = await Promise.all([
				api.tfd.motoristas.byId(id),
				api.tfd.viagens.list().then((all) => all.filter((v) => v.motoristaId === id))
			]);
			m = mot;
			viagens = vgs;
		} catch (e) {
			erro = mensagemErroTfd(e);
		} finally {
			carregando = false;
		}
	}

	onMount(carregar);

	async function toggleStatus() {
		if (!m) return;
		try {
			if (m.status === 'ATIVO') {
				await api.tfd.motoristas.afastar(m.id);
				notificar('ok', 'Motorista afastado.');
			} else {
				await api.tfd.motoristas.reativar(m.id);
				notificar('ok', 'Motorista reativado.');
			}
			m = await api.tfd.motoristas.byId(m.id);
		} catch (e) {
			notificar('erro', mensagemErroTfd(e));
		}
	}
</script>

<div class="flex flex-col gap-4">
	<button
		type="button"
		onclick={() => goto('/tfd/motoristas')}
		class="self-start border border-slate-300 bg-white px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-slate-700 uppercase hover:border-blue-900 hover:text-blue-900"
	>
		← Voltar
	</button>

	{#if mensagem}
		<div
			class="border px-3 py-2 font-mono text-[11px] font-bold tracking-wider uppercase
				{mensagem.tipo === 'ok'
				? 'border-emerald-700 bg-emerald-50 text-emerald-900'
				: 'border-red-700 bg-red-50 text-red-900'}"
		>
			{mensagem.tipo === 'ok' ? '✓' : '⚠'} {mensagem.texto}
		</div>
	{/if}

	{#if erro}
		<div
			class="border border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
		>
			⚠ {erro}
		</div>
	{/if}

	{#if carregando}
		<div class="border border-slate-200 bg-white p-6">
			<div class="h-5 w-1/2 animate-pulse bg-slate-100"></div>
			<div class="mt-3 h-3 w-1/3 animate-pulse bg-slate-100"></div>
		</div>
	{:else if !m}
		<div class="border-2 border-red-700 bg-red-50 p-6 text-center">
			<div class="font-mono text-sm font-bold tracking-widest text-red-900 uppercase">
				Motorista não encontrado
			</div>
		</div>
	{:else}
		<div class="flex items-center justify-between border border-slate-200 bg-white px-4 py-3">
			<div class="flex items-center gap-3">
				<div
					class="flex h-12 w-12 items-center justify-center border border-slate-300 bg-blue-900 font-mono text-base font-bold text-white"
				>
					{m.nome
						.split(' ')
						.slice(0, 2)
						.map((n) => n[0])
						.join('')}
				</div>
				<div class="leading-tight">
					<div class="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
						MOTORISTA · {m.status}
					</div>
					<div class="font-sans text-sm font-bold text-slate-900">{m.nome}</div>
					<div class="font-mono text-[11px] text-slate-600">
						CPF {formatarCpf(m.cpf)} · CNH {m.cnh} cat. {m.categoriaCnh}
					</div>
				</div>
			</div>
			{#if podeOperar && m.status !== 'INATIVO'}
				<PrimaryButton
					label={m.status === 'ATIVO' ? 'Afastar' : 'Reativar'}
					variant="secondary"
					onclick={toggleStatus}
				/>
			{/if}
		</div>

		{#if m.cnhVencidaEm < 0}
			<div
				class="border-l-4 border-red-700 bg-red-50 px-4 py-2.5 font-mono text-[11px] font-bold tracking-wider text-red-900 uppercase"
			>
				⚠ CNH VENCIDA HÁ {Math.abs(m.cnhVencidaEm)} DIAS · MOTORISTA NÃO PODE OPERAR
			</div>
		{:else if m.cnhVencidaEm <= 60}
			<div
				class="border-l-4 border-amber-600 bg-amber-50 px-4 py-2.5 font-mono text-[11px] font-bold tracking-wider text-amber-900 uppercase"
			>
				⚠ CNH VENCE EM {m.cnhVencidaEm} DIAS · PROVIDENCIAR RENOVAÇÃO
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<MetricCard label="Viagens Realizadas" value={concluidas} sublabel="Histórico" />
			<MetricCard label="Total Lançado" value={m.totalViagens} sublabel="Inclui canceladas" />
			<MetricCard
				label="KM Rodados"
				value={m.totalKmRodados.toLocaleString('pt-BR')}
				sublabel="Hodômetro acumulado"
			/>
			<MetricCard
				label="Validade CNH"
				value={formatarData(m.validadeCnh)}
				sublabel={`Categoria ${m.categoriaCnh}`}
				accent={m.cnhVencidaEm < 0 ? 'critical' : m.cnhVencidaEm <= 60 ? 'warning' : 'default'}
			/>
		</div>

		<div class="border border-slate-200 bg-white">
			<PanelHeader title="Histórico de Viagens" index="01">
				<span
					class="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase"
				>
					{viagens.length} REGISTROS
				</span>
			</PanelHeader>
			{#if viagens.length === 0}
				<div class="px-4 py-6 text-center font-mono text-xs text-slate-500">
					Nenhuma viagem registrada para este motorista.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-xs">
						<thead>
							<tr
								class="border-b border-slate-200 bg-slate-50 text-left font-mono text-[10px] tracking-widest text-slate-600 uppercase"
							>
								<th class="border-r border-slate-200 px-3 py-2">Data</th>
								<th class="border-r border-slate-200 px-3 py-2">Veículo</th>
								<th class="border-r border-slate-200 px-3 py-2">Destino</th>
								<th class="border-r border-slate-200 px-3 py-2">Vagas</th>
								<th class="px-3 py-2">Status</th>
							</tr>
						</thead>
						<tbody class="font-mono">
							{#each viagens as v (v.id)}
								<tr
									class="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
									onclick={() => goto(`/tfd/viagens/${v.id}`)}
								>
									<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
										{formatarData(v.data)}
									</td>
									<td class="border-r border-slate-100 px-3 py-2 font-bold text-blue-900">
										{v.veiculoPlaca ?? '—'}
									</td>
									<td class="border-r border-slate-100 px-3 py-2 font-sans text-slate-700">
										{v.destino}
									</td>
									<td class="border-r border-slate-100 px-3 py-2 text-slate-700">
										{v.vagasOcupadas}/{v.vagasTotais}
									</td>
									<td class="px-3 py-2 text-slate-700">{v.status.replace('_', ' ')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
