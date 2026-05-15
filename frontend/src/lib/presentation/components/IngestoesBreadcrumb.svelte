<script lang="ts">
	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		items: Crumb[];
	}

	let { items }: Props = $props();
</script>

<nav
	class="flex flex-wrap items-center gap-2 border border-slate-200 bg-white px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase"
	aria-label="Navegação hierárquica"
>
	{#each items as c, i (i)}
		{#if i > 0}
			<span class="text-slate-300">/</span>
		{/if}
		{#if c.href && i < items.length - 1}
			<a href={c.href} class="text-slate-600 hover:text-blue-900">{c.label}</a>
		{:else}
			<span class="font-bold text-blue-900">{c.label}</span>
		{/if}
	{/each}
</nav>
