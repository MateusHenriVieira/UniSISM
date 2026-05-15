<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import PrimaryButton from '$lib/presentation/components/PrimaryButton.svelte';
	import { goto } from '$app/navigation';
</script>

<section class="flex flex-col gap-4">
	<div class="border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
		<div
			class="mx-auto mb-3 flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-50"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="h-6 w-6 text-slate-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
				/>
			</svg>
		</div>
		<div class="font-mono text-[11px] font-bold tracking-widest text-slate-700 uppercase">
			Integrações · Aguardando Backend
		</div>
		<p class="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600">
			O status em tempo real dos conectores externos (CADSUS · e-SUS APS · SISREG) e internos
			(Storage S3 · ClamAV · OCR · Webhook UBS) será exibido aqui quando o endpoint
			<code class="mx-1 border border-slate-300 bg-slate-100 px-1.5 py-px font-mono">
				GET /admin/integracoes
			</code>
			estiver disponível. Hoje, o health desses serviços é verificado via
			<code class="mx-1 border border-slate-300 bg-slate-100 px-1.5 py-px font-mono">/health</code>
			do backend e pelas métricas Prometheus (ver <code>BACKEND_GUIDE.md §13</code>).
		</p>
		<div class="mt-4 flex justify-center gap-2">
			<PrimaryButton
				label="Voltar a Configurações"
				variant="secondary"
				onclick={() => goto('/sms/configuracoes')}
			/>
		</div>
	</div>

	<!-- Referência das integrações previstas -->
	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Integrações Previstas"
			subtitle="Roadmap contratual · habilitadas conforme homologação federal"
			index="01"
		/>
		<div class="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2">
			{#each [
				{ nome: 'CADSUS', descricao: 'Cadastro Nacional de Usuários do SUS', tipo: 'Federal' },
				{ nome: 'e-SUS APS', descricao: 'Sincronização do PEC municipal', tipo: 'Federal' },
				{ nome: 'SISREG', descricao: 'Sistema Nacional de Regulação', tipo: 'Federal' },
				{ nome: 'Webhook UBS', descricao: 'Notificação de decisões da Regulação', tipo: 'Interno' },
				{ nome: 'Storage S3', descricao: 'Armazenamento de anexos e relatórios', tipo: 'Interno' },
				{ nome: 'OCR Service', descricao: 'Extração estruturada de PDFs', tipo: 'Interno' }
			] as i (i.nome)}
				<div class="bg-white p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="font-mono text-sm font-bold text-slate-900">{i.nome}</div>
						<span
							class="border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-slate-700 uppercase"
						>
							{i.tipo}
						</span>
					</div>
					<div class="mt-1 text-xs text-slate-700">{i.descricao}</div>
				</div>
			{/each}
		</div>
	</div>
</section>
