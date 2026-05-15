<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Visão Geral', href: '/tfd/dashboard', shortcut: '1' },
		{ label: 'Solicitações Pendentes', href: '/tfd/dashboard/solicitacoes', shortcut: '2' },
		{ label: 'Viagens Ativas', href: '/tfd/dashboard/viagens-ativas', shortcut: '3' }
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
