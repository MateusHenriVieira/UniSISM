<script lang="ts">
	import type { StatusScanAnexo } from '$lib/api/types';

	interface Props {
		status: StatusScanAnexo;
		compact?: boolean;
	}

	let { status, compact = false }: Props = $props();

	const map: Record<
		StatusScanAnexo,
		{ label: string; icon: string; classes: string; tooltip: string }
	> = {
		PENDENTE: {
			label: 'SCANEANDO',
			icon: '⟳',
			classes: 'border-slate-400 text-slate-700 bg-slate-100',
			tooltip: 'Antivírus ainda analisando. Download desabilitado até o scan concluir.'
		},
		LIMPO: {
			label: 'LIMPO',
			icon: '✓',
			classes: 'border-emerald-700 text-emerald-800 bg-emerald-50',
			tooltip: 'Arquivo verificado pelo ClamAV. Download liberado.'
		},
		INFECTADO: {
			label: 'INFECTADO',
			icon: '⛔',
			classes: 'border-red-700 text-red-800 bg-red-50',
			tooltip: 'Arquivo contém ameaça. Download bloqueado.'
		},
		FALHOU: {
			label: 'FALHA',
			icon: '⚠',
			classes: 'border-amber-600 text-amber-800 bg-amber-50',
			tooltip: 'Não foi possível escanear o arquivo. Contate o suporte.'
		}
	};

	const cfg = $derived(map[status]);
</script>

<span
	title={cfg.tooltip}
	class="inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider {cfg.classes}"
>
	<span aria-hidden="true">{cfg.icon}</span>
	{#if !compact}
		<span>{cfg.label}</span>
	{/if}
</span>
