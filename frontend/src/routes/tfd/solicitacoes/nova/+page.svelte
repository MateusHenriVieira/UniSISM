<script lang="ts">
	import FormField from '$lib/presentation/components/FormField.svelte';
	import PanelHeader from '$lib/presentation/components/PanelHeader.svelte';
	import PrimaryButton from '$lib/presentation/components/PrimaryButton.svelte';
	import { api, ApiError } from '$lib/api';
	import { mensagemErroTfd } from '$lib/api/erros-tfd';
	import type { Ubs } from '$lib/api/types';
	import type {
		DadosAcompanhante,
		DadosPacienteInline,
		PrioridadeTFD
	} from '$lib/api/tfd-types';
	import { useAuth } from '$lib/presentation/contexts/authContext';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const auth = useAuth();

	// ─── Bloqueio de acesso ───
	let bloqueado = $derived(
		!auth.podeGerenciarTFD && !auth.ehReguladorTfdSimples
	);

	// ─── UBSs (para o vínculo) ───
	let ubsList = $state<Ubs[]>([]);
	let carregandoUbs = $state(true);

	// ─── Paciente ───
	let pacienteNome = $state('');
	let pacienteCpf = $state('');
	let pacienteRg = $state('');
	let pacienteDataNasc = $state('');
	let pacienteSexo = $state<'M' | 'F' | 'OUTRO'>('M');
	let pacienteTelefone = $state('');
	let pacienteCartaoSus = $state('');
	let pacienteNomeMae = $state('');
	let pacienteEndereco = $state('');
	let pacienteBairro = $state('');
	let pacienteMunicipio = $state('');
	let pacienteUf = $state('');
	let pacienteCep = $state('');

	// ─── Solicitação ───
	let ubsId = $state('');
	let especialidade = $state('');
	let destino = $state('');
	let unidadeDestino = $state('');
	let dataDesejada = $state('');
	let prioridade = $state<PrioridadeTFD>('ELETIVA');
	let motivo = $state('');
	let observacoes = $state('');

	// ─── Acompanhante ───
	let temAcompanhante = $state(false);
	let acompanhanteNome = $state('');
	let acompanhanteCpf = $state('');
	let acompanhanteRg = $state('');
	let acompanhanteDataNasc = $state('');
	let acompanhanteTelefone = $state('');
	let acompanhanteParentesco = $state('');

	// ─── Estado de envio ───
	let enviando = $state(false);
	let erro = $state('');
	let sucesso = $state<{ protocolo: string; id: string } | null>(null);

	const especialidadesComuns = [
		'CARDIOLOGIA',
		'OFTALMOLOGIA',
		'ORTOPEDIA',
		'NEUROLOGIA',
		'ONCOLOGIA',
		'GINECOLOGIA',
		'PEDIATRIA',
		'DERMATOLOGIA',
		'OTORRINOLARINGOLOGIA',
		'UROLOGIA',
		'ENDOCRINOLOGIA',
		'PSIQUIATRIA',
		'NEFROLOGIA',
		'PNEUMOLOGIA',
		'REUMATOLOGIA',
		'GASTROENTEROLOGIA',
		'HEMATOLOGIA',
		'CIRURGIA_GERAL',
		'CIRURGIA_VASCULAR'
	];
	const parentescos = [
		'CONJUGE',
		'FILHO_A',
		'PAI',
		'MAE',
		'IRMAO_A',
		'AVO',
		'NETO_A',
		'TIO_A',
		'SOBRINHO_A',
		'CUIDADOR',
		'OUTRO'
	];

	onMount(async () => {
		try {
			ubsList = await api.admin.listUbs();
			if (ubsList.length === 1) ubsId = ubsList[0].id;
		} catch {
			// Silencia — campo aparece vazio se não tem permissão de listar.
		} finally {
			carregandoUbs = false;
		}
	});

	function validar(): string | null {
		if (!pacienteNome.trim()) return 'Nome do paciente é obrigatório.';
		if (pacienteCpf.replace(/\D/g, '').length !== 11)
			return 'CPF do paciente inválido (precisa de 11 dígitos).';
		if (!pacienteDataNasc) return 'Data de nascimento do paciente é obrigatória.';
		if (!pacienteTelefone.trim()) return 'Telefone do paciente é obrigatório.';
		if (!pacienteEndereco.trim()) return 'Endereço do paciente é obrigatório.';
		if (!ubsId) return 'Selecione a UBS de origem.';
		if (!especialidade.trim()) return 'Selecione a especialidade da consulta.';
		if (!destino.trim()) return 'Informe o município de destino.';
		if (!dataDesejada) return 'Informe a data desejada para a viagem.';
		if (!motivo.trim() || motivo.trim().length < 10)
			return 'Descreva o motivo da viagem (mínimo 10 caracteres).';
		if (temAcompanhante) {
			if (!acompanhanteNome.trim()) return 'Nome do acompanhante é obrigatório.';
			if (acompanhanteCpf.replace(/\D/g, '').length !== 11)
				return 'CPF do acompanhante inválido.';
			if (!acompanhanteDataNasc) return 'Data de nascimento do acompanhante é obrigatória.';
			if (!acompanhanteTelefone.trim()) return 'Telefone do acompanhante é obrigatório.';
			if (!acompanhanteParentesco) return 'Selecione o parentesco do acompanhante.';
		}
		return null;
	}

	async function enviar() {
		erro = '';
		const v = validar();
		if (v) {
			erro = v;
			return;
		}
		enviando = true;
		try {
			const paciente: DadosPacienteInline = {
				nome: pacienteNome.trim(),
				cpf: pacienteCpf.replace(/\D/g, ''),
				dataNascimento: pacienteDataNasc,
				sexo: pacienteSexo,
				telefone: pacienteTelefone.trim(),
				endereco: pacienteEndereco.trim(),
				cartaoSus: pacienteCartaoSus.trim() || undefined,
				nomeMae: pacienteNomeMae.trim() || undefined,
				rg: pacienteRg.trim() || undefined,
				bairro: pacienteBairro.trim() || undefined,
				municipio: pacienteMunicipio.trim() || undefined,
				uf: pacienteUf.trim() || undefined,
				cep: pacienteCep.trim() || undefined
			};
			const acompanhante: DadosAcompanhante | undefined = temAcompanhante
				? {
						nome: acompanhanteNome.trim(),
						cpf: acompanhanteCpf.replace(/\D/g, ''),
						dataNascimento: acompanhanteDataNasc,
						telefone: acompanhanteTelefone.trim(),
						parentesco: acompanhanteParentesco,
						rg: acompanhanteRg.trim() || undefined
					}
				: undefined;
			const r = await api.tfd.solicitacoes.create({
				paciente,
				ubsId,
				destino: destino.trim(),
				unidadeDestino: unidadeDestino.trim() || undefined,
				especialidade,
				motivo: motivo.trim(),
				dataDesejada,
				prioridade,
				acompanhanteNecessario: temAcompanhante,
				acompanhante,
				observacoes: observacoes.trim() || undefined
			});
			sucesso = { protocolo: r.protocolo, id: r.id };
		} catch (e) {
			if (e instanceof ApiError) {
				erro = mensagemErroTfd(e);
			} else {
				erro = 'Falha de conexão com o servidor.';
			}
		} finally {
			enviando = false;
		}
	}

	function novaOutra() {
		pacienteNome = '';
		pacienteCpf = '';
		pacienteRg = '';
		pacienteDataNasc = '';
		pacienteSexo = 'M';
		pacienteTelefone = '';
		pacienteCartaoSus = '';
		pacienteNomeMae = '';
		pacienteEndereco = '';
		pacienteBairro = '';
		pacienteMunicipio = '';
		pacienteUf = '';
		pacienteCep = '';
		especialidade = '';
		destino = '';
		unidadeDestino = '';
		dataDesejada = '';
		prioridade = 'ELETIVA';
		motivo = '';
		observacoes = '';
		temAcompanhante = false;
		acompanhanteNome = '';
		acompanhanteCpf = '';
		acompanhanteRg = '';
		acompanhanteDataNasc = '';
		acompanhanteTelefone = '';
		acompanhanteParentesco = '';
		erro = '';
		sucesso = null;
	}

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		enviar();
	}
</script>

{#if bloqueado}
	<div class="border-2 border-red-700 bg-red-50 p-6 text-center">
		<div class="font-mono text-sm font-bold tracking-widest text-red-900 uppercase">
			Permissão insuficiente
		</div>
		<p class="mt-2 text-xs text-red-800">
			Sua função não pode cadastrar solicitações TFD.
		</p>
	</div>
{:else if sucesso}
	<div class="border-2 border-emerald-700 bg-emerald-50 p-6">
		<div class="font-mono text-[11px] font-bold tracking-widest text-emerald-800 uppercase">
			✓ SOLICITAÇÃO CADASTRADA
		</div>
		<div class="mt-2 font-mono text-2xl font-bold text-emerald-900">
			{sucesso.protocolo}
		</div>
		<p class="mt-2 font-sans text-xs text-emerald-900">
			A gestão TFD será notificada e fará a aprovação. Você pode acompanhar pelo
			<strong>Dashboard</strong>.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<PrimaryButton label="Cadastrar Outra" onclick={novaOutra} />
			<PrimaryButton
				label="Voltar ao Dashboard"
				variant="secondary"
				onclick={() => goto('/tfd/dashboard')}
			/>
			{#if auth.podeGerenciarTFD}
				<PrimaryButton
					label="Abrir Detalhe"
					variant="secondary"
					onclick={() => goto(`/tfd/solicitacoes/${sucesso!.id}`)}
				/>
			{/if}
		</div>
	</div>
{:else}
	<form onsubmit={onSubmit} class="flex flex-col gap-4">
		<!-- Paciente -->
		<div class="border border-slate-200 bg-white">
			<PanelHeader
				title="Identificação do Paciente"
				subtitle="Quem vai viajar — todos os dados ficam salvos no PEC municipal"
				index="01"
			/>
			<div class="p-4">
				<div class="grid grid-cols-12 gap-3">
					<FormField label="Nome Completo" name="pnome" span={8} bind:value={pacienteNome} />
					<FormField
						label="Data de Nascimento"
						name="pdn"
						type="date"
						span={4}
						mono
						bind:value={pacienteDataNasc}
					/>
					<FormField label="CPF" name="pcpf" span={4} mono bind:value={pacienteCpf} />
					<FormField label="RG (opcional)" name="prg" span={4} mono bind:value={pacienteRg} />
					<div class="col-span-4 flex flex-col">
						<label
							for="psexo"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							Sexo
						</label>
						<select
							id="psexo"
							bind:value={pacienteSexo}
							class="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
						>
							<option value="M">Masculino</option>
							<option value="F">Feminino</option>
							<option value="OUTRO">Outro</option>
						</select>
					</div>
					<FormField label="Telefone" name="ptel" span={4} mono bind:value={pacienteTelefone} />
					<FormField
						label="Cartão SUS (opcional)"
						name="pcs"
						span={4}
						mono
						bind:value={pacienteCartaoSus}
					/>
					<FormField
						label="Nome da Mãe (opcional)"
						name="pnm"
						span={4}
						bind:value={pacienteNomeMae}
					/>
					<FormField
						label="Endereço completo"
						name="pend"
						span={12}
						placeholder="Logradouro, número, complemento"
						bind:value={pacienteEndereco}
					/>
					<FormField label="Bairro" name="pbairro" span={4} bind:value={pacienteBairro} />
					<FormField label="Município" name="pmun" span={4} bind:value={pacienteMunicipio} />
					<FormField label="UF" name="puf" span={2} mono bind:value={pacienteUf} />
					<FormField label="CEP (opcional)" name="pcep" span={2} mono bind:value={pacienteCep} />
				</div>
			</div>
		</div>

		<!-- Solicitação clínica -->
		<div class="border border-slate-200 bg-white">
			<PanelHeader
				title="Detalhes da Viagem"
				subtitle="Especialidade · destino · prioridade · motivo"
				index="02"
			/>
			<div class="p-4">
				<div class="grid grid-cols-12 gap-3">
					<div class="col-span-6 flex flex-col">
						<label
							for="ubs"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							UBS de Origem
						</label>
						<select
							id="ubs"
							bind:value={ubsId}
							disabled={carregandoUbs}
							class="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50"
						>
							<option value="">— Selecione a UBS —</option>
							{#each ubsList as u (u.id)}
								<option value={u.id}>{u.nome} · {u.municipio}/{u.uf}</option>
							{/each}
						</select>
					</div>
					<div class="col-span-6 flex flex-col">
						<label
							for="esp"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							Especialidade
						</label>
						<input
							list="lista-esp"
							id="esp"
							bind:value={especialidade}
							placeholder="Ex.: CARDIOLOGIA"
							class="w-full border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
						/>
						<datalist id="lista-esp">
							{#each especialidadesComuns as e (e)}
								<option value={e}></option>
							{/each}
						</datalist>
					</div>

					<FormField
						label="Município de Destino"
						name="destino"
						span={6}
						placeholder="Ex.: Recife/PE"
						bind:value={destino}
					/>
					<FormField
						label="Unidade de Destino (opcional)"
						name="udest"
						span={6}
						placeholder="Ex.: Hospital das Clínicas"
						bind:value={unidadeDestino}
					/>

					<FormField
						label="Data desejada"
						name="ddes"
						type="date"
						span={4}
						mono
						bind:value={dataDesejada}
					/>
					<div class="col-span-4 flex flex-col">
						<label
							for="prio"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							Prioridade
						</label>
						<select
							id="prio"
							bind:value={prioridade}
							class="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
						>
							<option value="ELETIVA">Eletiva</option>
							<option value="PRIORITARIA">Prioritária</option>
							<option value="URGENTE">Urgente</option>
						</select>
					</div>
					<div class="col-span-4 flex items-end">
						<label class="flex cursor-pointer items-center gap-2 font-mono text-xs text-slate-700">
							<input
								type="checkbox"
								bind:checked={temAcompanhante}
								class="h-4 w-4 cursor-pointer border-slate-400"
							/>
							<span class="font-semibold tracking-widest uppercase">Tem Acompanhante</span>
						</label>
					</div>

					<div class="col-span-12 flex flex-col">
						<label
							for="motivo"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							Motivo / Procedimento (mínimo 10 caracteres)
						</label>
						<textarea
							id="motivo"
							bind:value={motivo}
							rows="3"
							placeholder="Ex.: Consulta de retorno com cardiologista para ajuste de medicação. Encaminhamento da UBS."
							class="w-full resize-none border border-slate-300 bg-white px-2.5 py-1.5 font-sans text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
						></textarea>
					</div>

					<div class="col-span-12 flex flex-col">
						<label
							for="obs"
							class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
						>
							Observações (opcional)
						</label>
						<textarea
							id="obs"
							bind:value={observacoes}
							rows="2"
							placeholder="Ex.: paciente cadeirante; alergia conhecida a látex."
							class="w-full resize-none border border-slate-300 bg-white px-2.5 py-1.5 font-sans text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
						></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- Acompanhante -->
		{#if temAcompanhante}
			<div class="border border-slate-200 bg-white">
				<PanelHeader
					title="Dados do Acompanhante"
					subtitle="Quem viajará com o paciente"
					index="03"
				/>
				<div class="p-4">
					<div class="grid grid-cols-12 gap-3">
						<FormField
							label="Nome Completo"
							name="anome"
							span={8}
							bind:value={acompanhanteNome}
						/>
						<FormField
							label="Data de Nascimento"
							name="adn"
							type="date"
							span={4}
							mono
							bind:value={acompanhanteDataNasc}
						/>
						<FormField label="CPF" name="acpf" span={4} mono bind:value={acompanhanteCpf} />
						<FormField
							label="RG (opcional)"
							name="arg"
							span={4}
							mono
							bind:value={acompanhanteRg}
						/>
						<FormField
							label="Telefone"
							name="atel"
							span={4}
							mono
							bind:value={acompanhanteTelefone}
						/>
						<div class="col-span-12 flex flex-col">
							<label
								for="aparent"
								class="mb-1 text-[10px] font-semibold tracking-widest text-slate-600 uppercase"
							>
								Parentesco com o Paciente
							</label>
							<select
								id="aparent"
								bind:value={acompanhanteParentesco}
								class="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
							>
								<option value="">— Selecione —</option>
								{#each parentescos as p (p)}
									<option value={p}>{p.replace('_', ' ')}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Box de auditoria -->
		<div class="border-l-4 border-blue-900 bg-blue-50 px-4 py-2 font-sans text-[12px] text-blue-900">
			<strong class="font-mono tracking-widest uppercase">Próximo passo:</strong>
			a gestão TFD valida o cadastro, decide pela aprovação e aloca o paciente em uma viagem.
			Você acompanha tudo pelo Dashboard.
		</div>

		{#if erro}
			<div
				class="border border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
			>
				⚠ {erro}
			</div>
		{/if}

		<div class="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
			<PrimaryButton
				label="Cancelar"
				variant="secondary"
				onclick={() => goto('/tfd/dashboard')}
			/>
			<PrimaryButton label="Cadastrar Solicitação" type="submit" loading={enviando} />
		</div>
	</form>
{/if}
