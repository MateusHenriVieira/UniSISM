<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import { useHistorico } from '$lib/presentation/contexts/historicoContext';

	const ctx = useHistorico();
	let filtrada = $derived(ctx.lista.filter((e) => e.status === 'APROVADO'));
</script>

<HistoricoTable
	titulo="Aprovados pela Regulação"
	subtitulo="Encaminhamentos autorizados e em agendamento"
	lista={filtrada}
	carregando={ctx.carregando}
	mostrarStatus={false}
/>
