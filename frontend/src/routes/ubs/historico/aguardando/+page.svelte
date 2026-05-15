<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import { useHistorico } from '$lib/presentation/contexts/historicoContext';

	const ctx = useHistorico();
	let filtrada = $derived(ctx.lista.filter((e) => e.status === 'AGUARDANDO_REGULACAO'));
</script>

<HistoricoTable
	titulo="Aguardando Regulação"
	subtitulo="Encaminhamentos em fila na Secretaria Municipal de Saúde"
	lista={filtrada}
	carregando={ctx.carregando}
	mostrarStatus={false}
/>
