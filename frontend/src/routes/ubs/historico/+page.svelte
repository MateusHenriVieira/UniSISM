<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import { useHistorico } from '$lib/presentation/contexts/historicoContext';

	const ctx = useHistorico();
</script>

<HistoricoTable
	titulo="Histórico Completo"
	subtitulo="Todos os encaminhamentos dos últimos 30 dias"
	lista={ctx.lista}
	carregando={ctx.carregando}
/>
