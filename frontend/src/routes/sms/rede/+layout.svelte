<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'UBSs', href: '/sms/rede/ubs', shortcut: '1' },
		{ label: 'Usuários', href: '/sms/rede/usuarios', shortcut: '2' }
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
