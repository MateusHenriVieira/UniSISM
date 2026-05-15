<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import IngestoesBreadcrumb from '$lib/presentation/components/IngestoesBreadcrumb.svelte';
	import MetricCard from '$lib/presentation/components/MetricCard.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento, Ubs } from '$lib/api/types';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let ubsId = $derived(decodeURIComponent(page.params.ubsId ?? ''));
	let ano = $derived(Number(page.params.ano ?? '0'));
	let mes = $derived(Number(page.params.mes ?? '0'));
	let dia = $derived(Number(page.params.dia ?? '0'));

	let encs = $state<Encaminhamento[]>([]);
	let ubs = $state<Ubs | null>(null);
	let carregando = $state(true);

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

	onMount(async () => {
		try {
			const [listaEnc, listaUbs] = await Promise.all([
				api.encaminhamentos.list({ limit: 1000 }),
				api.admin.listUbs()
			]);
			const ubsMatch = listaUbs.find((u) => u.id === ubsId) ?? null;
			ubs = ubsMatch;
			encs = listaEnc.filter((e) => {
				const d = new Date(e.criadoEm);
				return (
					(ubsMatch ? e.unidadeOrigem.includes(ubsMatch.nome) : e.unidadeOrigem === ubsId) &&
					d.getFullYear() === ano &&
					d.getMonth() + 1 === mes &&
					d.getDate() === dia
				);
			});
		} finally {
			carregando = false;
		}
	});

	let nomeUbs = $derived(ubs?.nome ?? ubsId);
	let nomeMes = $derived(mes >= 1 && mes <= 12 ? mesNomes[mes - 1] : '—');

	let aguardando = $derived(
		encs.filter((e) => e.status === 'AGUARDANDO_REGULACAO').length
	);
	let pendencia = $derived(
		encs.filter((e) => e.status === 'PENDENCIA_DOCUMENTO').length
	);
	let aprovado = $derived(encs.filter((e) => e.status === 'APROVADO').length);
	let rejeitado = $derived(encs.filter((e) => e.status === 'REJEITADO').length);

	let dataFormatada = $derived(
		`${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
	);
</script>

<div class="flex flex-col gap-4">
	<IngestoesBreadcrumb
		items={[
			{ label: 'Arquivo', href: '/sms/ingestoes' },
			{ label: nomeUbs, href: `/sms/ingestoes/${encodeURIComponent(ubsId)}` },
			{ label: String(ano), href: `/sms/ingestoes/${encodeURIComponent(ubsId)}/${ano}` },
			{
				label: nomeMes,
				href: `/sms/ingestoes/${encodeURIComponent(ubsId)}/${ano}/${String(mes).padStart(2, '0')}`
			},
			{ label: `Dia ${String(dia).padStart(2, '0')}` }
		]}
	/>

	<!-- KPIs do dia -->
	<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<MetricCard
			label="Aguardando Regulação"
			value={carregando ? '—' : aguardando}
			sublabel="Em fila"
			accent="warning"
		/>
		<MetricCard
			label="Pendências"
			value={carregando ? '—' : pendencia}
			sublabel="Aguardando UBS"
			accent="critical"
		/>
		<MetricCard
			label="Aprovados"
			value={carregando ? '—' : aprovado}
			sublabel="Decididos"
			accent="success"
		/>
		<MetricCard
			label="Rejeitados"
			value={carregando ? '—' : rejeitado}
			sublabel="Fora de protocolo"
		/>
	</section>

	<!-- Lista do dia -->
	<HistoricoTable
		titulo={`${nomeUbs} · ${dataFormatada}`}
		subtitulo={`Encaminhamentos criados em ${dataFormatada}`}
		lista={encs}
		{carregando}
		detalheBasePath="/sms/encaminhamento"
	/>
</div>
