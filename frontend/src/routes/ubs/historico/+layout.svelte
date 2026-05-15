<script lang="ts">
	import SubNav from '$lib/presentation/components/SubNav.svelte';
	import { api } from '$lib/api';
	import type { Encaminhamento } from '$lib/domain/models/Encaminhamento';
	import { setHistoricoContext } from '$lib/presentation/contexts/historicoContext';
	import { onMount } from 'svelte';

	let { children } = $props();

	let lista = $state<Encaminhamento[]>([]);
	let carregando = $state(true);

	setHistoricoContext({
		get lista() {
			return lista;
		},
		get carregando() {
			return carregando;
		}
	});

	onMount(async () => {
		try {
			lista = await api.encaminhamentos.list({ limit: 500 });
		} finally {
			carregando = false;
		}
	});

	let aguardandoCount = $derived(lista.filter((e) => e.status === 'AGUARDANDO_REGULACAO').length);
	let pendenciasCount = $derived(lista.filter((e) => e.status === 'PENDENCIA_DOCUMENTO').length);
	let aprovadosCount = $derived(lista.filter((e) => e.status === 'APROVADO').length);
	let rejeitadosCount = $derived(lista.filter((e) => e.status === 'REJEITADO').length);

	let tabs = $derived([
		{ label: 'Todos', href: '/ubs/historico', shortcut: '1', badge: lista.length },
		{
			label: 'Aguardando',
			href: '/ubs/historico/aguardando',
			shortcut: '2',
			badge: aguardandoCount,
			badgeTone: 'warning' as const
		},
		{
			label: 'Pendências',
			href: '/ubs/historico/pendencias',
			shortcut: '3',
			badge: pendenciasCount,
			badgeTone: 'critical' as const
		},
		{
			label: 'Aprovados',
			href: '/ubs/historico/aprovados',
			shortcut: '4',
			badge: aprovadosCount,
			badgeTone: 'success' as const
		},
		{
			label: 'Rejeitados',
			href: '/ubs/historico/rejeitados',
			shortcut: '5',
			badge: rejeitadosCount
		}
	]);
</script>

<div class="flex flex-col gap-4">
	<SubNav {tabs} />
	{@render children()}
</div>
