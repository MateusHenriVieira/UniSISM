<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Produção da Rede', href: '/sms/analytics', shortcut: '1' },
		{ label: 'Especialidades', href: '/sms/analytics/especialidades', shortcut: '2' },
		{ label: 'SLA da Regulação', href: '/sms/analytics/sla', shortcut: '3' },
		{ label: 'Geográfico', href: '/sms/analytics/geografico', shortcut: '4' }
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
