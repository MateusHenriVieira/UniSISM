<script lang="ts">
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import PrimaryButton from '$lib/presentation/components/PrimaryButton.svelte';
	import { goto } from '$app/navigation';

	/**
	 * Parâmetros institucionais (SLA, política de senha, retenção LGPD, uploads).
	 * Este módulo depende de um endpoint `GET /admin/configuracoes` ainda a ser
	 * implementado no backend (ver BACKEND_GUIDE.md §19 · Roadmap Sprint 6).
	 *
	 * Até lá, a UI exibe apenas um painel indicando o estado e o link para a
	 * documentação dos valores default em vigor via deploy.
	 */
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
					d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
				/>
			</svg>
		</div>
		<div class="font-mono text-[11px] font-bold tracking-widest text-slate-700 uppercase">
			Parâmetros · Aguardando Endpoint
		</div>
		<p class="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600">
			Este módulo será habilitado quando o endpoint
			<code class="mx-1 border border-slate-300 bg-slate-100 px-1.5 py-px font-mono">
				GET /admin/configuracoes
			</code>
			estiver disponível. Os valores atualmente em vigor (SLA por prioridade clínica, política
			de senha, retenção LGPD, limites de upload) são definidos via <strong>deploy</strong>
			e documentados em <code>BACKEND_GUIDE.md §16</code>.
		</p>
		<div class="mt-4 flex justify-center gap-2">
			<PrimaryButton
				label="Voltar a Configurações"
				variant="secondary"
				onclick={() => goto('/sms/configuracoes')}
			/>
		</div>
	</div>

	<!-- Resumo dos valores contratuais (referência, não editáveis nesta UI) -->
	<div class="border border-slate-200 bg-white">
		<PanelHeader
			title="Valores Institucionais em Vigor"
			subtitle="Read-only · definidos por deploy até o endpoint existir"
			index="01"
		/>
		<div class="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2">
			<div class="bg-white p-4">
				<div class="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
					SLA por Prioridade
				</div>
				<ul class="mt-2 space-y-1 font-mono text-[11px] text-slate-800">
					<li>EMERGÊNCIA → 2h</li>
					<li>URGENTE → 12h</li>
					<li>PRIORITÁRIA → 72h</li>
					<li>ELETIVA → 240h</li>
				</ul>
			</div>
			<div class="bg-white p-4">
				<div class="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
					Política de Senha
				</div>
				<ul class="mt-2 space-y-1 font-mono text-[11px] text-slate-800">
					<li>Mínimo 8 caracteres</li>
					<li>Validade 180 dias</li>
					<li>Bloqueio após 5 falhas em 15 min</li>
					<li>2FA obrigatório · REGULADOR_SMS · ADMIN</li>
				</ul>
			</div>
			<div class="bg-white p-4">
				<div class="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
					Uploads
				</div>
				<ul class="mt-2 space-y-1 font-mono text-[11px] text-slate-800">
					<li>Máx. por arquivo: 10 MB</li>
					<li>Máx. por requisição: 30 MB</li>
					<li>MIMEs: PDF · JPG · PNG</li>
					<li>Antivírus: ClamAV (scan assíncrono)</li>
				</ul>
			</div>
			<div class="bg-white p-4">
				<div class="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
					Retenção LGPD
				</div>
				<ul class="mt-2 space-y-1 font-mono text-[11px] text-slate-800">
					<li>Encaminhamentos: 20 anos</li>
					<li>Prontuário (PEC): vitalício</li>
					<li>Audit log: 5 anos</li>
					<li>Sessões expiradas: 90 dias</li>
				</ul>
			</div>
		</div>
	</div>
</section>
