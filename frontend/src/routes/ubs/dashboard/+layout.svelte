<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Visão Geral', href: '/ubs/dashboard', shortcut: '1' },
		{ label: 'Minha Produção', href: '/ubs/dashboard/producao', shortcut: '2' },
		{
			label: 'Fila de Regulação',
			href: '/ubs/dashboard/fila',
			shortcut: '3',
			badge: 9,
			badgeTone: 'critical' as const
		}
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
