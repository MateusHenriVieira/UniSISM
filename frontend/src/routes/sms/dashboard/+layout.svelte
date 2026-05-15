<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';

	let { children } = $props();

	/**
	 * Abas do Dashboard da Regulação.
	 * - Visão Geral: KPIs + fila ativa de análise
	 * - Pendentes: encaminhamentos aguardando análise do regulador
	 * - Aprovados: decididos como APROVADO
	 * - Rejeitados: decididos como REJEITADO
	 */
	const tabs = [
		{ label: 'Visão Geral', href: '/sms/dashboard', shortcut: '1' },
		{
			label: 'Pendentes',
			href: '/sms/dashboard/pendentes',
			shortcut: '2',
			badgeTone: 'warning' as const
		},
		{
			label: 'Aprovados',
			href: '/sms/dashboard/aprovados',
			shortcut: '3',
			badgeTone: 'success' as const
		},
		{
			label: 'Rejeitados',
			href: '/sms/dashboard/rejeitados',
			shortcut: '4'
		}
	];
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
