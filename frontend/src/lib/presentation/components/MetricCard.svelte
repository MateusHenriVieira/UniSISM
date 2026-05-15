<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		sublabel?: string;
		trend?: string;
		trendDirection?: 'up' | 'down' | 'neutral';
		accent?: 'default' | 'warning' | 'critical' | 'success';
	}

	let {
		label,
		value,
		sublabel = '',
		trend = '',
		trendDirection = 'neutral',
		accent = 'default'
	}: Props = $props();

	const accentBar = {
		default: 'bg-blue-900',
		warning: 'bg-amber-600',
		critical: 'bg-red-700',
		success: 'bg-emerald-700'
	};

	const trendColor = {
		up: 'text-emerald-700',
		down: 'text-red-700',
		neutral: 'text-slate-500'
	};
</script>

<div
	class="group relative flex flex-col border border-slate-200 bg-white transition-all hover:shadow-md"
>
	<div class="absolute top-0 left-0 h-full w-1 {accentBar[accent]}"></div>
	<div class="py-4 pr-4 pl-5">
		<div class="flex items-center justify-between">
			<div class="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
				{label}
			</div>
		</div>
		<div class="mt-3 flex items-baseline gap-2">
			<span class="font-mono text-3xl font-bold tracking-tight text-slate-900">{value}</span>
			{#if trend}
				<span class="font-mono text-xs font-semibold {trendColor[trendDirection]}">
					{trend}
				</span>
			{/if}
		</div>
		{#if sublabel}
			<div class="mt-2 text-[11px] leading-tight text-slate-600">{sublabel}</div>
		{/if}
	</div>
</div>
