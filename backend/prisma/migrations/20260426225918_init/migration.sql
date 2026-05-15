-- CreateEnum
CREATE TYPE "RoleAtendente" AS ENUM ('DESENVOLVEDOR', 'ADMIN', 'COORDENADOR_UBS', 'ATENDENTE_UBS', 'REGULADOR_SMS', 'GESTOR_TFD');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('M', 'F', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusEncaminhamento" AS ENUM ('RASCUNHO', 'AGUARDANDO_REGULACAO', 'PENDENCIA_DOCUMENTO', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "PrioridadeClinica" AS ENUM ('ELETIVA', 'PRIORITARIA', 'URGENTE', 'EMERGENCIA');

-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('SOLICITACAO', 'RG', 'CPF', 'CARTAO_SUS', 'EXAME', 'LAUDO', 'RESPOSTA_SUS', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoEventoTimeline" AS ENUM ('CRIADO', 'DOCUMENTO_ANEXADO', 'ENVIADO_REGULACAO', 'PENDENCIA_REGISTRADA', 'APROVADO', 'REJEITADO', 'AGENDADO', 'OBSERVACAO', 'RESPOSTA_SUS_RECEBIDA', 'EDITADO');

-- CreateEnum
CREATE TYPE "TipoNotificacaoPaciente" AS ENUM ('ENCAMINHAMENTO_CRIADO', 'PENDENCIA_REGISTRADA', 'PENDENCIA_RESOLVIDA', 'APROVADO', 'AGENDADO', 'REJEITADO', 'RESPOSTA_SUS_DISPONIVEL');

-- CreateEnum
CREATE TYPE "GrupoSanguineo" AS ENUM ('A_POSITIVO', 'A_NEGATIVO', 'B_POSITIVO', 'B_NEGATIVO', 'AB_POSITIVO', 'AB_NEGATIVO', 'O_POSITIVO', 'O_NEGATIVO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'OUTRO');

-- CreateEnum
CREATE TYPE "RacaCor" AS ENUM ('BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADA');

-- CreateEnum
CREATE TYPE "TipoAlergia" AS ENUM ('MEDICAMENTO', 'ALIMENTO', 'AMBIENTAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "GravidadeAlergia" AS ENUM ('LEVE', 'MODERADA', 'GRAVE');

-- CreateEnum
CREATE TYPE "TipoAtendimento" AS ENUM ('CONSULTA_MEDICA', 'ENFERMAGEM', 'VACINACAO', 'CURATIVO', 'ODONTOLOGICO', 'PROCEDIMENTO', 'ACOLHIMENTO');

-- CreateEnum
CREATE TYPE "StatusViagemTFD" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA', 'EM_ANDAMENTO');

-- CreateEnum
CREATE TYPE "TransporteTFD" AS ENUM ('VAN_SMS', 'AMBULANCIA', 'PASSAGEM_RODOVIARIA', 'PASSAGEM_AEREA');

-- CreateEnum
CREATE TYPE "CategoriaExame" AS ENUM ('LABORATORIAL', 'IMAGEM', 'FUNCIONAL', 'OUTROS');

-- CreateEnum
CREATE TYPE "ResultadoExame" AS ENUM ('NORMAL', 'ALTERADO', 'CRITICO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "ViaAplicacaoVacina" AS ENUM ('INTRAMUSCULAR', 'SUBCUTANEA', 'ORAL', 'INTRADERMICA');

-- CreateEnum
CREATE TYPE "TipoRelatorio" AS ENUM ('PRODUCAO_INDIVIDUAL', 'ENCAMINHAMENTOS_POR_ESPECIALIDADE', 'FILA_REGULACAO', 'PENDENCIAS_RESOLVIDAS', 'TFD_CUSTOS', 'VACINACAO_UBS', 'BUSCA_ATIVA');

-- CreateEnum
CREATE TYPE "FormatoRelatorio" AS ENUM ('PDF', 'CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "StatusRelatorio" AS ENUM ('DISPONIVEL', 'PROCESSANDO', 'FALHA');

-- CreateEnum
CREATE TYPE "StatusScanAnexo" AS ENUM ('PENDENTE', 'LIMPO', 'INFECTADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "AcaoAuditRelatorio" AS ENUM ('CRIADO', 'DOWNLOAD', 'FALHA', 'EXPIRADO', 'EXCLUIDO');

-- CreateEnum
CREATE TYPE "AcaoProntuario" AS ENUM ('ADD_ALERGIA', 'REMOVE_ALERGIA', 'ADD_CONDICAO_CRONICA', 'UPDATE_CONDICAO_CRONICA', 'REMOVE_CONDICAO_CRONICA', 'ADD_MEDICAMENTO', 'UPDATE_MEDICAMENTO', 'REMOVE_MEDICAMENTO', 'SET_HISTORICO_FAMILIAR', 'ADD_ATENDIMENTO', 'REMOVE_ATENDIMENTO', 'ADD_EXAME', 'REMOVE_EXAME', 'ADD_VACINA', 'REMOVE_VACINA', 'ADD_VIAGEM_TFD', 'UPDATE_VIAGEM_TFD', 'REMOVE_VIAGEM_TFD');

-- CreateEnum
CREATE TYPE "TipoVeiculoTFD" AS ENUM ('VAN', 'ONIBUS', 'CARRO', 'AMBULANCIA');

-- CreateEnum
CREATE TYPE "StatusVeiculoTFD" AS ENUM ('ATIVO', 'EM_MANUTENCAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "CombustivelVeiculo" AS ENUM ('DIESEL', 'GASOLINA', 'ETANOL', 'FLEX', 'GNV', 'ELETRICO');

-- CreateEnum
CREATE TYPE "CategoriaCNH" AS ENUM ('B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "StatusMotoristaTFD" AS ENUM ('ATIVO', 'AFASTADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoTFD" AS ENUM ('PENDENTE', 'APROVADA', 'ALOCADA', 'REALIZADA', 'NEGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PrioridadeSolicTFD" AS ENUM ('ELETIVA', 'PRIORITARIA', 'URGENTE');

-- CreateEnum
CREATE TYPE "TipoAnexoSolicTFD" AS ENUM ('COMPROVANTE_ENCAMINHAMENTO', 'EXAME', 'LAUDO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusViagemFrota" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PresencaPassageiro" AS ENUM ('AGUARDANDO', 'CONFIRMADO', 'EMBARCADO', 'AUSENTE', 'DESISTIU');

-- CreateEnum
CREATE TYPE "StatusAbastecimento" AS ENUM ('SOLICITADO', 'LIBERADO', 'REALIZADO', 'NEGADO');

-- CreateEnum
CREATE TYPE "StatusAjudaCusto" AS ENUM ('PENDENTE', 'AUTORIZADA', 'PAGA', 'NEGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MetodoPagamentoAjuda" AS ENUM ('PIX', 'TRANSFERENCIA', 'DINHEIRO_RH');

-- CreateEnum
CREATE TYPE "AcaoAuditoriaTFD" AS ENUM ('VEICULO_CRIADO', 'VEICULO_ATUALIZADO', 'VEICULO_MANUTENCAO', 'VEICULO_REATIVADO', 'VEICULO_DELETADO', 'MOTORISTA_CRIADO', 'MOTORISTA_ATUALIZADO', 'MOTORISTA_AFASTADO', 'MOTORISTA_REATIVADO', 'MOTORISTA_DELETADO', 'SOLICITACAO_CRIADA', 'SOLICITACAO_APROVADA', 'SOLICITACAO_NEGADA', 'SOLICITACAO_ANEXO_ENVIADO', 'VIAGEM_CRIADA', 'VIAGEM_ATUALIZADA', 'VIAGEM_INICIADA', 'VIAGEM_CONCLUIDA', 'VIAGEM_CANCELADA', 'PASSAGEIRO_ALOCADO', 'PASSAGEIRO_REMOVIDO', 'PRESENCA_MARCADA', 'ABASTECIMENTO_SOLICITADO', 'ABASTECIMENTO_LIBERADO', 'ABASTECIMENTO_NEGADO', 'ABASTECIMENTO_REALIZADO', 'SALDO_AJUSTADO', 'AJUDA_CUSTO_CRIADA', 'AJUDA_CUSTO_AUTORIZADA', 'AJUDA_CUSTO_PAGA', 'AJUDA_CUSTO_NEGADA');

-- CreateTable
CREATE TABLE "prefeituras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'BA',
    "cnpj" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "deletadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prefeituras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubs" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'BA',
    "endereco" TEXT,
    "cnes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "deletadoEm" TIMESTAMP(3),
    "prefeituraId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendentes" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "cargo" TEXT NOT NULL DEFAULT 'ATENDENTE DE REGULAÇÃO',
    "funcao" TEXT NOT NULL DEFAULT 'Operador do canal de ingestão de encaminhamentos',
    "role" "RoleAtendente" NOT NULL DEFAULT 'ATENDENTE_UBS',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "bloqueadoAte" TIMESTAMP(3),
    "dataAdmissao" TIMESTAMP(3),
    "twoFAAtivo" BOOLEAN NOT NULL DEFAULT false,
    "metodoTwoFA" TEXT,
    "senhaAlteradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletadoEm" TIMESTAMP(3),
    "ubsId" TEXT,
    "prefeituraId" TEXT,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atendentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "sessaoId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "dispositivo" TEXT,
    "local" TEXT,
    "ultimoUsoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_codes" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "resetToken" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "consumidoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_login" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "sucesso" BOOLEAN NOT NULL,
    "atendenteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_logs" (
    "id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "payload" JSONB,
    "atendenteId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades_atendente" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "alvo" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_atendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeSocial" TEXT,
    "cpf" TEXT NOT NULL,
    "cartaoSus" TEXT,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "telefone" TEXT,
    "telefoneSecundario" TEXT,
    "email" TEXT,
    "nomeMae" TEXT,
    "nomePai" TEXT,
    "estadoCivil" "EstadoCivil" NOT NULL DEFAULT 'OUTRO',
    "escolaridade" TEXT,
    "profissao" TEXT,
    "racaCor" "RacaCor" NOT NULL DEFAULT 'NAO_INFORMADA',
    "endereco" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "grupoSanguineo" "GrupoSanguineo" NOT NULL DEFAULT 'NAO_INFORMADO',
    "historicoFamiliar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agenteComunitario" TEXT,
    "microarea" TEXT,
    "equipeSaudeFamilia" TEXT,
    "ubsId" TEXT NOT NULL,
    "cadastradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alergias" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "substancia" TEXT NOT NULL,
    "tipo" "TipoAlergia" NOT NULL,
    "gravidade" "GravidadeAlergia" NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "alergias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicoes_cronicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "cid10" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,

    CONSTRAINT "condicoes_cronicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos_em_uso" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dosagem" TEXT NOT NULL,
    "frequencia" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "prescritor" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medicamentos_em_uso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimentos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoAtendimento" NOT NULL,
    "profissional" TEXT NOT NULL,
    "registroProfissional" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "queixaPrincipal" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "cid10" TEXT NOT NULL,
    "conduta" TEXT NOT NULL,
    "prescricaoResumo" TEXT,

    CONSTRAINT "atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens_tfd" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "dataIda" TIMESTAMP(3) NOT NULL,
    "dataVolta" TIMESTAMP(3) NOT NULL,
    "destino" TEXT NOT NULL,
    "unidadeDestino" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "acompanhante" BOOLEAN NOT NULL DEFAULT false,
    "transporte" "TransporteTFD" NOT NULL,
    "status" "StatusViagemTFD" NOT NULL DEFAULT 'AGENDADA',
    "custoEstimadoBRL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viagens_tfd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exames_realizados" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" "CategoriaExame" NOT NULL,
    "solicitante" TEXT NOT NULL,
    "unidadeExecutora" TEXT NOT NULL,
    "resultado" "ResultadoExame" NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "exames_realizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacinas_aplicadas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "vacina" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "aplicador" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "via" "ViaAplicacaoVacina" NOT NULL,

    CONSTRAINT "vacinas_aplicadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos_atendentes" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "registro" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "ultimaConsulta" TIMESTAMP(3) NOT NULL,
    "totalConsultas" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "medicos_atendentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encaminhamentos" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "status" "StatusEncaminhamento" NOT NULL DEFAULT 'AGUARDANDO_REGULACAO',
    "pacienteId" TEXT,
    "pacienteNome" TEXT NOT NULL,
    "pacienteCpf" TEXT NOT NULL,
    "pacienteCartaoSus" TEXT NOT NULL,
    "pacienteDataNascimento" TIMESTAMP(3) NOT NULL,
    "pacienteSexo" "Sexo" NOT NULL,
    "pacienteTelefone" TEXT NOT NULL,
    "pacienteEndereco" TEXT NOT NULL,
    "medicoSolicitante" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "especialidadeSolicitada" TEXT NOT NULL,
    "cid10" TEXT NOT NULL,
    "cidDescricao" TEXT NOT NULL,
    "justificativaClinica" TEXT NOT NULL,
    "prioridade" "PrioridadeClinica" NOT NULL,
    "dataSolicitacao" TIMESTAMP(3) NOT NULL,
    "observacoesRegulacao" TEXT,
    "agendamentoPrevisto" TIMESTAMP(3),
    "respostaSusAnexoId" TEXT,
    "respostaSusObservacao" TEXT,
    "respostaSusRegistradoEm" TIMESTAMP(3),
    "respostaSusRegistradoPorId" TEXT,
    "respostaSusRegistradoPorNome" TEXT,
    "respostaSusRegistradoPorMat" TEXT,
    "unidadeOrigem" TEXT NOT NULL,
    "atendenteResponsavel" TEXT NOT NULL,
    "ubsId" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),

    CONSTRAINT "encaminhamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_documentos" (
    "id" TEXT NOT NULL,
    "encaminhamentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoAnexo" NOT NULL,
    "tamanhoKb" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "sha256" TEXT,
    "scanStatus" "StatusScanAnexo" NOT NULL DEFAULT 'PENDENTE',
    "scanEm" TIMESTAMP(3),
    "uploadEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_timeline" (
    "id" TEXT NOT NULL,
    "encaminhamentoId" TEXT NOT NULL,
    "tipo" "TipoEventoTimeline" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "autorPapel" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorio_job" (
    "id" TEXT NOT NULL,
    "tipo" "TipoRelatorio" NOT NULL,
    "titulo" TEXT NOT NULL,
    "periodoIni" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "formato" "FormatoRelatorio" NOT NULL,
    "status" "StatusRelatorio" NOT NULL DEFAULT 'PROCESSANDO',
    "filtros" JSONB NOT NULL DEFAULT '{}',
    "erroTraceId" TEXT,
    "atendenteId" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "ubsId" TEXT,
    "storageKey" TEXT,
    "contentType" TEXT,
    "tamanhoBytes" BIGINT,
    "tamanhoKb" INTEGER NOT NULL DEFAULT 0,
    "hashSha256" TEXT,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "ultimoDownload" TIMESTAMP(3),

    CONSTRAINT "relatorio_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorio_audit" (
    "id" BIGSERIAL NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "acao" "AcaoAuditRelatorio" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "detalhes" JSONB,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatorio_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequenciais_protocolo" (
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequenciais_protocolo_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "pacientes_contas" (
    "id" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cpfFormatado" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "senhaProvisoria" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_paciente" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_paciente" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "pacienteCpf" TEXT NOT NULL,
    "encaminhamentoId" TEXT,
    "tipo" "TipoNotificacaoPaciente" NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "payload" JSONB,
    "lidaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente_prontuario_audit" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorPapel" TEXT NOT NULL,
    "acao" "AcaoProntuario" NOT NULL,
    "recursoId" TEXT,
    "dados" JSONB NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_prontuario_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_veiculos" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "tipo" "TipoVeiculoTFD" NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "combustivel" "CombustivelVeiculo" NOT NULL,
    "consumoMedioKml" DECIMAL(5,2) NOT NULL,
    "hodometroAtualKm" BIGINT NOT NULL DEFAULT 0,
    "proximaRevisaoKm" BIGINT,
    "proximaRevisaoEm" TIMESTAMP(3),
    "status" "StatusVeiculoTFD" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,

    CONSTRAINT "tfd_veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_motoristas" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "categoriaCnh" "CategoriaCNH" NOT NULL,
    "validadeCnh" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT NOT NULL,
    "status" "StatusMotoristaTFD" NOT NULL DEFAULT 'ATIVO',
    "totalViagens" INTEGER NOT NULL DEFAULT 0,
    "totalKmRodados" BIGINT NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "deletadoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,

    CONSTRAINT "tfd_motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_solicitacoes" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "ubsId" TEXT NOT NULL,
    "encaminhamentoOrigemId" TEXT,
    "destino" TEXT NOT NULL,
    "unidadeDestino" TEXT,
    "especialidade" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "dataDesejada" TIMESTAMP(3) NOT NULL,
    "acompanhanteNecessario" BOOLEAN NOT NULL DEFAULT false,
    "prioridade" "PrioridadeSolicTFD" NOT NULL,
    "status" "StatusSolicitacaoTFD" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "motivoNegacao" TEXT,
    "viagemId" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaEm" TIMESTAMP(3),
    "decididaPorId" TEXT,
    "deletadaEm" TIMESTAMP(3),

    CONSTRAINT "tfd_solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_solicitacao_anexos" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoAnexoSolicTFD" NOT NULL,
    "tamanhoKb" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "scanStatus" "StatusScanAnexo" NOT NULL DEFAULT 'PENDENTE',
    "scanEm" TIMESTAMP(3),
    "uploadEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadPorId" TEXT NOT NULL,

    CONSTRAINT "tfd_solicitacao_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_viagens" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaSaida" TEXT NOT NULL,
    "horaPrevistaRetorno" TEXT,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "unidadeDestino" TEXT,
    "rotaResumo" TEXT,
    "kmEstimados" INTEGER,
    "kmInicialHodometro" BIGINT,
    "kmFinalHodometro" BIGINT,
    "vagasTotais" INTEGER NOT NULL,
    "observacoes" TEXT,
    "status" "StatusViagemFrota" NOT NULL DEFAULT 'AGENDADA',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadaPorId" TEXT NOT NULL,
    "iniciadaEm" TIMESTAMP(3),
    "concluidaEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,

    CONSTRAINT "tfd_viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_viagem_passageiros" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "numeroAssento" INTEGER,
    "acompanhante" BOOLEAN NOT NULL DEFAULT false,
    "presenca" "PresencaPassageiro" NOT NULL DEFAULT 'AGUARDANDO',
    "observacao" TEXT,
    "marcadoEm" TIMESTAMP(3),
    "marcadoPorId" TEXT,

    CONSTRAINT "tfd_viagem_passageiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_abastecimentos" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "motoristaId" TEXT,
    "viagemId" TEXT,
    "posto" TEXT NOT NULL,
    "litros" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "combustivel" "CombustivelVeiculo" NOT NULL,
    "valorPorLitro" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "valorEstimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hodometroKm" BIGINT NOT NULL DEFAULT 0,
    "kmDesdeUltimo" INTEGER,
    "consumoCalcKml" DECIMAL(5,2),
    "status" "StatusAbastecimento" NOT NULL DEFAULT 'SOLICITADO',
    "comprovanteKey" TEXT,
    "motivoNegacao" TEXT,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitadoPorId" TEXT NOT NULL,
    "liberadoEm" TIMESTAMP(3),
    "liberadoPorId" TEXT,
    "realizadoEm" TIMESTAMP(3),
    "realizadoPorId" TEXT,

    CONSTRAINT "tfd_abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_saldo_veiculo" (
    "veiculoId" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "saldoMensal" DECIMAL(14,2) NOT NULL,
    "saldoConsumido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "saldoReservado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tfd_saldo_veiculo_pkey" PRIMARY KEY ("veiculoId","mes")
);

-- CreateTable
CREATE TABLE "tfd_saldo_ajustes" (
    "id" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "saldoAnterior" DECIMAL(14,2) NOT NULL,
    "saldoNovo" DECIMAL(14,2) NOT NULL,
    "justificativa" TEXT NOT NULL,
    "ajustadoPorId" TEXT NOT NULL,
    "ajustadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tfd_saldo_ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_ajudas_custo" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "status" "StatusAjudaCusto" NOT NULL DEFAULT 'PENDENTE',
    "metodoPagamento" "MetodoPagamentoAjuda",
    "comprovantePagamentoKey" TEXT,
    "motivoNegacao" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadaPorId" TEXT NOT NULL,
    "autorizadaEm" TIMESTAMP(3),
    "autorizadaPorId" TEXT,
    "pagaEm" TIMESTAMP(3),
    "pagaPorId" TEXT,

    CONSTRAINT "tfd_ajudas_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tfd_audit_log" (
    "id" TEXT NOT NULL,
    "prefeituraId" TEXT NOT NULL,
    "acao" "AcaoAuditoriaTFD" NOT NULL,
    "recursoTipo" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoProtocolo" TEXT,
    "operadorId" TEXT NOT NULL,
    "operadorNome" TEXT NOT NULL,
    "operadorMatricula" TEXT NOT NULL,
    "operadorRole" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "hashAnterior" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tfd_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prefeituras_cnpj_key" ON "prefeituras"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "ubs_cnes_key" ON "ubs"("cnes");

-- CreateIndex
CREATE INDEX "ubs_prefeituraId_idx" ON "ubs"("prefeituraId");

-- CreateIndex
CREATE UNIQUE INDEX "atendentes_matricula_key" ON "atendentes"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "atendentes_email_key" ON "atendentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "atendentes_cpf_key" ON "atendentes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_sessaoId_key" ON "refresh_tokens"("sessaoId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_codes_resetToken_key" ON "password_reset_codes"("resetToken");

-- CreateIndex
CREATE INDEX "tentativas_login_login_criadoEm_idx" ON "tentativas_login"("login", "criadoEm");

-- CreateIndex
CREATE INDEX "tentativas_login_ip_criadoEm_idx" ON "tentativas_login"("ip", "criadoEm");

-- CreateIndex
CREATE INDEX "auditoria_logs_recurso_recursoId_idx" ON "auditoria_logs"("recurso", "recursoId");

-- CreateIndex
CREATE INDEX "auditoria_logs_atendenteId_criadoEm_idx" ON "auditoria_logs"("atendenteId", "criadoEm");

-- CreateIndex
CREATE INDEX "atividades_atendente_atendenteId_em_idx" ON "atividades_atendente"("atendenteId", "em");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cpf_key" ON "pacientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cartaoSus_key" ON "pacientes"("cartaoSus");

-- CreateIndex
CREATE INDEX "pacientes_ubsId_idx" ON "pacientes"("ubsId");

-- CreateIndex
CREATE INDEX "pacientes_nome_idx" ON "pacientes"("nome");

-- CreateIndex
CREATE INDEX "atendimentos_pacienteId_data_idx" ON "atendimentos"("pacienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_tfd_protocolo_key" ON "viagens_tfd"("protocolo");

-- CreateIndex
CREATE INDEX "viagens_tfd_pacienteId_idx" ON "viagens_tfd"("pacienteId");

-- CreateIndex
CREATE INDEX "exames_realizados_pacienteId_data_idx" ON "exames_realizados"("pacienteId", "data");

-- CreateIndex
CREATE INDEX "vacinas_aplicadas_pacienteId_data_idx" ON "vacinas_aplicadas"("pacienteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "encaminhamentos_protocolo_key" ON "encaminhamentos"("protocolo");

-- CreateIndex
CREATE INDEX "encaminhamentos_ubsId_status_criadoEm_idx" ON "encaminhamentos"("ubsId", "status", "criadoEm");

-- CreateIndex
CREATE INDEX "encaminhamentos_pacienteId_idx" ON "encaminhamentos"("pacienteId");

-- CreateIndex
CREATE INDEX "encaminhamentos_atendenteId_idx" ON "encaminhamentos"("atendenteId");

-- CreateIndex
CREATE INDEX "anexos_documentos_encaminhamentoId_idx" ON "anexos_documentos"("encaminhamentoId");

-- CreateIndex
CREATE INDEX "anexos_documentos_scanStatus_idx" ON "anexos_documentos"("scanStatus");

-- CreateIndex
CREATE INDEX "eventos_timeline_encaminhamentoId_em_idx" ON "eventos_timeline"("encaminhamentoId", "em");

-- CreateIndex
CREATE INDEX "relatorio_job_atendenteId_geradoEm_idx" ON "relatorio_job"("atendenteId", "geradoEm" DESC);

-- CreateIndex
CREATE INDEX "relatorio_job_prefeituraId_geradoEm_idx" ON "relatorio_job"("prefeituraId", "geradoEm" DESC);

-- CreateIndex
CREATE INDEX "relatorio_job_status_geradoEm_idx" ON "relatorio_job"("status", "geradoEm");

-- CreateIndex
CREATE INDEX "relatorio_job_expiraEm_idx" ON "relatorio_job"("expiraEm");

-- CreateIndex
CREATE INDEX "relatorio_audit_relatorioId_em_idx" ON "relatorio_audit"("relatorioId", "em" DESC);

-- CreateIndex
CREATE INDEX "relatorio_audit_atendenteId_em_idx" ON "relatorio_audit"("atendenteId", "em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_contas_cpf_key" ON "pacientes_contas"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_paciente_tokenHash_key" ON "sessoes_paciente"("tokenHash");

-- CreateIndex
CREATE INDEX "sessoes_paciente_contaId_idx" ON "sessoes_paciente"("contaId");

-- CreateIndex
CREATE INDEX "notificacoes_paciente_contaId_criadaEm_idx" ON "notificacoes_paciente"("contaId", "criadaEm");

-- CreateIndex
CREATE INDEX "notificacoes_paciente_pacienteCpf_criadaEm_idx" ON "notificacoes_paciente"("pacienteCpf", "criadaEm");

-- CreateIndex
CREATE INDEX "notificacoes_paciente_encaminhamentoId_idx" ON "notificacoes_paciente"("encaminhamentoId");

-- CreateIndex
CREATE INDEX "outbox_events_publicadoEm_criadoEm_idx" ON "outbox_events"("publicadoEm", "criadoEm");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateType_aggregateId_idx" ON "outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "paciente_prontuario_audit_pacienteId_em_idx" ON "paciente_prontuario_audit"("pacienteId", "em");

-- CreateIndex
CREATE INDEX "paciente_prontuario_audit_autorId_em_idx" ON "paciente_prontuario_audit"("autorId", "em");

-- CreateIndex
CREATE INDEX "paciente_prontuario_audit_acao_em_idx" ON "paciente_prontuario_audit"("acao", "em");

-- CreateIndex
CREATE INDEX "tfd_veiculos_prefeituraId_status_deletadoEm_idx" ON "tfd_veiculos"("prefeituraId", "status", "deletadoEm");

-- CreateIndex
CREATE INDEX "tfd_veiculos_placa_idx" ON "tfd_veiculos"("placa");

-- CreateIndex
CREATE INDEX "tfd_motoristas_prefeituraId_status_deletadoEm_idx" ON "tfd_motoristas"("prefeituraId", "status", "deletadoEm");

-- CreateIndex
CREATE INDEX "tfd_motoristas_cpf_idx" ON "tfd_motoristas"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_solicitacoes_protocolo_key" ON "tfd_solicitacoes"("protocolo");

-- CreateIndex
CREATE INDEX "tfd_solicitacoes_prefeituraId_status_criadaEm_idx" ON "tfd_solicitacoes"("prefeituraId", "status", "criadaEm");

-- CreateIndex
CREATE INDEX "tfd_solicitacoes_pacienteId_idx" ON "tfd_solicitacoes"("pacienteId");

-- CreateIndex
CREATE INDEX "tfd_solicitacao_anexos_solicitacaoId_idx" ON "tfd_solicitacao_anexos"("solicitacaoId");

-- CreateIndex
CREATE INDEX "tfd_viagens_prefeituraId_status_data_idx" ON "tfd_viagens"("prefeituraId", "status", "data");

-- CreateIndex
CREATE INDEX "tfd_viagens_veiculoId_data_idx" ON "tfd_viagens"("veiculoId", "data");

-- CreateIndex
CREATE INDEX "tfd_viagens_motoristaId_data_idx" ON "tfd_viagens"("motoristaId", "data");

-- CreateIndex
CREATE INDEX "tfd_viagem_passageiros_viagemId_idx" ON "tfd_viagem_passageiros"("viagemId");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_viagem_passageiros_viagemId_solicitacaoId_key" ON "tfd_viagem_passageiros"("viagemId", "solicitacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_viagem_passageiros_viagemId_numeroAssento_key" ON "tfd_viagem_passageiros"("viagemId", "numeroAssento");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_abastecimentos_protocolo_key" ON "tfd_abastecimentos"("protocolo");

-- CreateIndex
CREATE INDEX "tfd_abastecimentos_prefeituraId_status_solicitadoEm_idx" ON "tfd_abastecimentos"("prefeituraId", "status", "solicitadoEm");

-- CreateIndex
CREATE INDEX "tfd_abastecimentos_veiculoId_solicitadoEm_idx" ON "tfd_abastecimentos"("veiculoId", "solicitadoEm");

-- CreateIndex
CREATE INDEX "tfd_saldo_veiculo_prefeituraId_mes_idx" ON "tfd_saldo_veiculo"("prefeituraId", "mes");

-- CreateIndex
CREATE INDEX "tfd_saldo_ajustes_veiculoId_mes_idx" ON "tfd_saldo_ajustes"("veiculoId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_ajudas_custo_protocolo_key" ON "tfd_ajudas_custo"("protocolo");

-- CreateIndex
CREATE INDEX "tfd_ajudas_custo_prefeituraId_status_criadaEm_idx" ON "tfd_ajudas_custo"("prefeituraId", "status", "criadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "tfd_ajudas_custo_viagemId_pacienteId_key" ON "tfd_ajudas_custo"("viagemId", "pacienteId");

-- CreateIndex
CREATE INDEX "tfd_audit_log_prefeituraId_em_idx" ON "tfd_audit_log"("prefeituraId", "em" DESC);

-- CreateIndex
CREATE INDEX "tfd_audit_log_recursoTipo_recursoId_em_idx" ON "tfd_audit_log"("recursoTipo", "recursoId", "em" DESC);

-- CreateIndex
CREATE INDEX "tfd_audit_log_acao_em_idx" ON "tfd_audit_log"("acao", "em");

-- AddForeignKey
ALTER TABLE "ubs" ADD CONSTRAINT "ubs_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendentes" ADD CONSTRAINT "atendentes_ubsId_fkey" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendentes" ADD CONSTRAINT "atendentes_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendentes" ADD CONSTRAINT "atendentes_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "atendentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_login" ADD CONSTRAINT "tentativas_login_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades_atendente" ADD CONSTRAINT "atividades_atendente_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_ubsId_fkey" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alergias" ADD CONSTRAINT "alergias_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicoes_cronicas" ADD CONSTRAINT "condicoes_cronicas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicamentos_em_uso" ADD CONSTRAINT "medicamentos_em_uso_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_tfd" ADD CONSTRAINT "viagens_tfd_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exames_realizados" ADD CONSTRAINT "exames_realizados_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacinas_aplicadas" ADD CONSTRAINT "vacinas_aplicadas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_atendentes" ADD CONSTRAINT "medicos_atendentes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_ubsId_fkey" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_documentos" ADD CONSTRAINT "anexos_documentos_encaminhamentoId_fkey" FOREIGN KEY ("encaminhamentoId") REFERENCES "encaminhamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_encaminhamentoId_fkey" FOREIGN KEY ("encaminhamentoId") REFERENCES "encaminhamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_job" ADD CONSTRAINT "relatorio_job_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "atendentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_job" ADD CONSTRAINT "relatorio_job_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_job" ADD CONSTRAINT "relatorio_job_ubsId_fkey" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_audit" ADD CONSTRAINT "relatorio_audit_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorio_job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_paciente" ADD CONSTRAINT "sessoes_paciente_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "pacientes_contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_paciente" ADD CONSTRAINT "notificacoes_paciente_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "pacientes_contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_veiculos" ADD CONSTRAINT "tfd_veiculos_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_motoristas" ADD CONSTRAINT "tfd_motoristas_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_solicitacoes" ADD CONSTRAINT "tfd_solicitacoes_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_solicitacoes" ADD CONSTRAINT "tfd_solicitacoes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_solicitacoes" ADD CONSTRAINT "tfd_solicitacoes_ubsId_fkey" FOREIGN KEY ("ubsId") REFERENCES "ubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_solicitacoes" ADD CONSTRAINT "tfd_solicitacoes_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "tfd_viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_solicitacao_anexos" ADD CONSTRAINT "tfd_solicitacao_anexos_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "tfd_solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagens" ADD CONSTRAINT "tfd_viagens_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagens" ADD CONSTRAINT "tfd_viagens_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "tfd_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagens" ADD CONSTRAINT "tfd_viagens_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "tfd_motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagem_passageiros" ADD CONSTRAINT "tfd_viagem_passageiros_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "tfd_viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagem_passageiros" ADD CONSTRAINT "tfd_viagem_passageiros_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "tfd_solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_viagem_passageiros" ADD CONSTRAINT "tfd_viagem_passageiros_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_abastecimentos" ADD CONSTRAINT "tfd_abastecimentos_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_abastecimentos" ADD CONSTRAINT "tfd_abastecimentos_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "tfd_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_abastecimentos" ADD CONSTRAINT "tfd_abastecimentos_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "tfd_motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_abastecimentos" ADD CONSTRAINT "tfd_abastecimentos_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "tfd_viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_saldo_veiculo" ADD CONSTRAINT "tfd_saldo_veiculo_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "tfd_veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_saldo_veiculo" ADD CONSTRAINT "tfd_saldo_veiculo_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_ajudas_custo" ADD CONSTRAINT "tfd_ajudas_custo_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_ajudas_custo" ADD CONSTRAINT "tfd_ajudas_custo_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "tfd_viagens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_ajudas_custo" ADD CONSTRAINT "tfd_ajudas_custo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tfd_audit_log" ADD CONSTRAINT "tfd_audit_log_prefeituraId_fkey" FOREIGN KEY ("prefeituraId") REFERENCES "prefeituras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
