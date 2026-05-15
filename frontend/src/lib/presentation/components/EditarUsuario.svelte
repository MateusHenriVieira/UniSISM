<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from './FormField.svelte';
	import PrimaryButton from './PrimaryButton.svelte';
	import { api, ApiError } from '$lib/api';
	import type { AtualizarUsuarioRequest, UsuarioListado } from '$lib/api/types';

	interface Props {
		usuario: UsuarioListado;
		onCancel: () => void;
		onSaved: (atualizado: UsuarioListado) => void;
	}

	let { usuario, onCancel, onSaved }: Props = $props();

	const orig = untrack(() => ({
		nome: usuario.nome,
		email: usuario.email
	}));

	let nome = $state(orig.nome);
	let email = $state(orig.email);
	let telefone = $state('');
	let cargo = $state('');
	let funcao = $state('');

	let enviando = $state(false);
	let erro = $state('');

	function diff(): AtualizarUsuarioRequest {
		const out: AtualizarUsuarioRequest = {};
		if (nome.trim() !== orig.nome) out.nome = nome.trim();
		if (email.trim().toLowerCase() !== orig.email.toLowerCase()) out.email = email.trim();
		if (telefone.trim()) out.telefone = telefone.trim();
		if (cargo.trim()) out.cargo = cargo.trim();
		if (funcao.trim()) out.funcao = funcao.trim();
		return out;
	}

	let pendente = $derived(Object.keys(diff()).length);
	let podeSalvar = $derived(pendente > 0 && !enviando && nome.trim().length > 0);

	async function salvar() {
		erro = '';
		const patch = diff();
		if (Object.keys(patch).length === 0) {
			erro = 'Nenhum campo foi alterado.';
			return;
		}
		if (!nome.trim()) {
			erro = 'O nome não pode ficar em branco.';
			return;
		}

		enviando = true;
		try {
			const r = await api.admin.updateUsuario(usuario.id, patch);
			// Backend responde com CriarUsuarioResponse (subset). Mesclamos no listado.
			const atualizado: UsuarioListado = {
				...usuario,
				nome: r.nome ?? usuario.nome,
				email: r.email ?? usuario.email,
				matricula: r.matricula ?? usuario.matricula,
				role: r.role ?? usuario.role
			};
			onSaved(atualizado);
		} catch (e) {
			if (e instanceof ApiError) {
				switch (e.code) {
					case 'NENHUMA_ALTERACAO':
						erro = 'Nenhuma alteração identificada.';
						break;
					case 'EMAIL_EM_USO':
						erro = 'Este email já está vinculado a outra matrícula.';
						break;
					case 'PERMISSAO_INSUFICIENTE':
						erro = 'Você não tem permissão para editar este usuário.';
						break;
					default:
						erro = e.message || 'Falha ao salvar alterações.';
				}
			} else {
				erro = 'Falha de conexão com o servidor.';
			}
		} finally {
			enviando = false;
		}
	}
</script>

<div class="flex flex-col gap-5 font-mono text-slate-900">
	<section
		class="border-l-4 border-blue-900 bg-blue-50 px-3 py-2 font-sans text-[12px] text-blue-900"
	>
		Dados administrativos do servidor. Alterações são auditadas e aplicadas imediatamente.
		Matrícula, CPF e role não podem ser alterados — requerem um novo usuário.
	</section>

	<!-- Identidade -->
	<section>
		<div class="mb-2 border-b border-slate-200 pb-1.5">
			<h3 class="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
				Identificação
			</h3>
		</div>
		<div class="grid grid-cols-12 gap-3">
			<FormField label="Nome Completo" name="nome" span={12} bind:value={nome} />
			<FormField
				label="Email Corporativo"
				name="email"
				span={8}
				mono
				type="email"
				bind:value={email}
			/>
			<FormField
				label="Telefone"
				name="telefone"
				span={4}
				mono
				placeholder="Opcional"
				bind:value={telefone}
			/>
		</div>
	</section>

	<!-- Atribuições -->
	<section>
		<div class="mb-2 border-b border-slate-200 pb-1.5">
			<h3 class="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
				Cargo & Função
			</h3>
		</div>
		<div class="grid grid-cols-12 gap-3">
			<FormField
				label="Cargo (ex: Enfermeiro)"
				name="cargo"
				span={6}
				placeholder="Opcional"
				bind:value={cargo}
			/>
			<FormField
				label="Função (ex: Técnico de Regulação)"
				name="funcao"
				span={6}
				placeholder="Opcional"
				bind:value={funcao}
			/>
		</div>
	</section>

	<!-- Campos imutáveis -->
	<section
		class="grid grid-cols-3 gap-3 border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700"
	>
		<div>
			<div class="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Matrícula</div>
			<div class="font-mono font-bold">{usuario.matricula}</div>
		</div>
		<div>
			<div class="text-[9px] font-bold tracking-widest text-slate-500 uppercase">CPF</div>
			<div class="font-mono font-bold">{usuario.cpf}</div>
		</div>
		<div>
			<div class="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Role</div>
			<div class="font-mono font-bold">{usuario.role}</div>
		</div>
	</section>

	{#if erro}
		<div
			class="border border-red-700 bg-red-50 px-3 py-2 font-mono text-[11px] font-bold tracking-wider text-red-800 uppercase"
		>
			⚠ {erro}
		</div>
	{/if}

	<div class="flex justify-between gap-2 border-t border-slate-200 pt-4">
		<span class="self-center font-mono text-[10px] tracking-widest text-slate-500 uppercase">
			{pendente === 0 ? 'Sem alterações' : `${pendente} campo(s) pendente(s)`}
		</span>
		<div class="flex gap-2">
			<PrimaryButton label="Cancelar" variant="secondary" onclick={onCancel} />
			<PrimaryButton
				label="Salvar Alterações"
				onclick={salvar}
				loading={enviando}
				disabled={!podeSalvar}
			/>
		</div>
	</div>
</div>
