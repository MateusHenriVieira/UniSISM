<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import { useHistorico } from '$lib/presentation/contexts/historicoContext';

	const ctx = useHistorico();
	let filtrada = $derived(ctx.lista.filter((e) => e.status === 'REJEITADO'));
</script>

<HistoricoTable
	titulo="Encaminhamentos Rejeitados"
	subtitulo="Recusados pela Regulação — requerem nova análise"
	lista={filtrada}
	carregando={ctx.carregando}
	mostrarStatus={false}
/>
