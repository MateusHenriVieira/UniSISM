/**
 * Tradução pt-BR dos códigos de erro específicos do módulo TFD.
 *
 * Sempre traduz pelo `code` (estável), nunca pela `message` do backend.
 * Quando o code não estiver listado, usa a mensagem original do backend
 * via fallback no chamador.
 *
 * Catálogo extraído de `backend/docs/TFD_FRONTEND.md §6`.
 */

import { ApiError } from './client';

export const ERROS_TFD: Record<string, string> = {
	// 4xx · validação
	PAYLOAD_INVALIDO: 'Dados inválidos. Verifique os campos.',
	ROLE_NAO_PERMITIDO: 'Sua função não tem permissão para esta operação.',

	// 4xx · não encontrado (isolation por prefeitura → 404)
	VEICULO_NAO_ENCONTRADO: 'Veículo não encontrado.',
	MOTORISTA_NAO_ENCONTRADO: 'Motorista não encontrado.',
	SOLICITACAO_NAO_ENCONTRADA: 'Solicitação não encontrada.',
	VIAGEM_NAO_ENCONTRADA: 'Viagem não encontrada.',
	ABASTECIMENTO_NAO_ENCONTRADO: 'Abastecimento não encontrado.',
	AJUDA_NAO_ENCONTRADA: 'Ajuda de custo não encontrada.',
	ANEXO_NAO_ENCONTRADO: 'Anexo não encontrado.',
	COMPROVANTE_AUSENTE: 'Anexe o comprovante primeiro.',

	// 409 · conflito
	PLACA_DUPLICADA: 'Já existe um veículo ativo com essa placa.',
	CPF_DUPLICADO: 'Já existe um motorista ativo com esse CPF.',
	STATUS_INVALIDO: 'Operação não permitida no status atual.',
	STATUS_TERMINAL: 'Este registro já foi concluído ou cancelado.',
	VIAGEM_STATUS_INVALIDO: 'Esta viagem não aceita mais passageiros.',
	ASSENTO_OCUPADO: 'Esse assento já está ocupado.',
	CAPACIDADE_EXCEDIDA: 'Viagem cheia — escolha outra.',
	ANEXO_NAO_LIBERADO: 'Anexo em verificação de segurança. Tente em instantes.',
	AJUDA_DUPLICADA: 'Esse paciente já tem ajuda de custo nessa viagem.',
	VEICULO_EM_USO: 'Conclua ou cancele as viagens deste veículo antes de excluir.',
	MOTORISTA_EM_USO: 'Conclua ou cancele as viagens deste motorista antes de excluir.',

	// 422 · regra de negócio
	VEICULO_REQUERIDO: 'Informe o veículo (placa ou ID).',
	VALOR_REQUERIDO: 'Informe o valor estimado.',
	VALOR_INVALIDO: 'Valor deve ser maior que zero.',
	ASSENTO_INVALIDO: 'Número de assento fora do intervalo do veículo.',
	VAGAS_INVALIDAS: 'Quantidade de vagas inválida.',
	VAGAS_EXCEDEM_CAPACIDADE: 'Vagas não podem exceder a capacidade do veículo.',
	CNH_VENCIDA: 'CNH do motorista está vencida.',
	MOTORISTA_INDISPONIVEL: 'Motorista afastado ou inativo.',
	VEICULO_INDISPONIVEL: 'Veículo em manutenção ou inativo.',
	HODOMETRO_INVALIDO: 'Hodômetro deve ser ≥ ao atual do veículo.',
	SALDO_INSUFICIENTE: 'Saldo do mês insuficiente. Solicite ajuste.',
	SALDO_AJUDA_INSUFICIENTE: 'Saldo de ajuda de custo insuficiente neste mês.',
	APORTE_INVALIDO: 'Valor de aporte deve ser maior que zero.',
	APORTE_FONTE_INVALIDA: 'Informe a fonte do recurso (empenho/portaria/repasse).',
	APORTE_DOCUMENTO_OBRIGATORIO: 'Número do documento (empenho/portaria) é obrigatório.',
	TETO_CATEGORIA_EXCEDIDO: 'Item excede o teto da categoria definido no saldo.',
	VALOR_EXCEDE_LIMITE: 'Valor excede 5% do estimado — requer aprovação adicional.',
	MOTIVO_OBRIGATORIO: 'Motivo é obrigatório (mínimo 10 caracteres).',
	JUSTIFICATIVA_OBRIGATORIA: 'Justificativa é obrigatória (mínimo 10 caracteres).',
	SOLICITACAO_NAO_APROVADA: 'Aprove a solicitação antes de alocar.',
	DATA_INVALIDA: 'Data inválida.',
	CPF_INVALIDO: 'CPF inválido (precisa ter 11 dígitos).',
	VALIDADE_CNH_INVALIDA: 'Data de validade da CNH inválida.',
	ITENS_OBRIGATORIOS: 'Adicione pelo menos 1 item à ajuda de custo.',
	VIAGEM_REALIZADA_IMUTAVEL: 'Viagem REALIZADA não pode ser excluída.',
	TRANSICAO_INVALIDA: 'Transição de status não permitida.'
};

/** Resolve a mensagem amigável para um erro qualquer da API. */
export function mensagemErroTfd(e: unknown): string {
	if (e instanceof ApiError) {
		return ERROS_TFD[e.code] ?? e.message ?? 'Falha ao executar operação.';
	}
	return 'Falha de conexão com o servidor.';
}
