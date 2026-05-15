<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Prefeituras', href: '/sms/configuracoes', shortcut: '1' },
		{ label: 'Parâmetros', href: '/sms/configuracoes/parametros', shortcut: '2' },
		{ label: 'Integrações', href: '/sms/configuracoes/integracoes', shortcut: '3' }
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
