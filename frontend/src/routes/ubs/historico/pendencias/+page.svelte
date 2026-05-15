<script lang="ts">
	import HistoricoTable from '$lib/presentation/components/HistoricoTable.svelte';
	import { useHistorico } from '$lib/presentation/contexts/historicoContext';

	const ctx = useHistorico();
	let filtrada = $derived(ctx.lista.filter((e) => e.status === 'PENDENCIA_DOCUMENTO'));
</script>

<HistoricoTable
	titulo="Pendências de Documento"
	subtitulo="Regulação solicitou correção ou envio adicional"
	lista={filtrada}
	carregando={ctx.carregando}
	mostrarStatus={false}
/>
