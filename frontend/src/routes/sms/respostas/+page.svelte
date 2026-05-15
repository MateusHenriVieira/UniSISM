<script lang="ts">
	import EncaminhamentoExplorer from '$lib/presentation/components/EncaminhamentoExplorer.svelte';

	/**
	 * Respostas Oficiais do SUS — mesmo explorador hierárquico,
	 * filtrando apenas casos com `respostaSUS != null` (server-side, v0.9.1).
	 */
</script>

<EncaminhamentoExplorer
	basePath="/sms/respostas"
	titulo="Respostas do SUS"
	subtitulo="Retornos oficiais da regulação federal · UBS · Ano · Mês · Dia"
	emojiVazio="📨"
	mensagemVazio="Nenhuma resposta oficial recebida ainda."
	respostaSUS={true}
	excluirRascunho
	dica="Cada item leva ao detalhe simplificado com Paciente · Clínico · Anexos."
/>
