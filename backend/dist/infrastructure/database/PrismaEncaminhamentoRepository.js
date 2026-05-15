"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaEncaminhamentoRepository = void 0;
const prisma_1 = require("../../../generated/prisma");
const prisma_2 = require("./prisma");
const errors_1 = require("../../shared/errors");
const mappers_1 = require("./mappers");
function rowParaDominio(r) {
    const paciente = {
        nome: r.pacienteNome,
        cpf: r.pacienteCpf,
        cartaoSus: r.pacienteCartaoSus,
        dataNascimento: (0, mappers_1.ymd)(r.pacienteDataNascimento),
        sexo: r.pacienteSexo,
        telefone: r.pacienteTelefone,
        endereco: r.pacienteEndereco,
    };
    const solicitacao = {
        medicoSolicitante: r.medicoSolicitante,
        crm: r.crm,
        especialidadeSolicitada: r.especialidadeSolicitada,
        cid10: r.cid10,
        cidDescricao: r.cidDescricao,
        justificativaClinica: r.justificativaClinica,
        prioridade: r.prioridade,
        dataSolicitacao: (0, mappers_1.ymd)(r.dataSolicitacao),
    };
    const anexos = r.anexos
        .slice()
        .sort((a, b) => a.uploadEm.getTime() - b.uploadEm.getTime())
        .map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        tamanhoKb: a.tamanhoKb,
        uploadEm: a.uploadEm.toISOString(),
    }));
    const timeline = r.timeline
        .slice()
        .sort((a, b) => a.em.getTime() - b.em.getTime())
        .map((e) => ({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        descricao: e.descricao,
        autor: e.autor,
        autorPapel: e.autorPapel,
        em: e.em.toISOString(),
    }));
    const enc = {
        id: r.id,
        protocolo: r.protocolo,
        paciente,
        solicitacao,
        anexos,
        status: r.status,
        criadoEm: r.criadoEm.toISOString(),
        atualizadoEm: r.atualizadoEm.toISOString(),
        unidadeOrigem: r.unidadeOrigem,
        atendenteResponsavel: r.atendenteResponsavel,
        timeline,
        agendamentoPrevisto: r.agendamentoPrevisto ? r.agendamentoPrevisto.toISOString() : null,
    };
    if (r.observacoesRegulacao)
        enc.observacoesRegulacao = r.observacoesRegulacao;
    return enc;
}
const INCLUDE_FULL = { anexos: true, timeline: true };
class PrismaEncaminhamentoRepository {
    async proximoProtocolo() {
        const ano = new Date().getUTCFullYear();
        const chave = `UBS-${ano}`;
        const seq = await prisma_2.prisma.sequencialProtocolo.upsert({
            where: { chave },
            create: { chave, valor: 1 },
            update: { valor: { increment: 1 } },
        });
        return `UBS-${ano}-${String(seq.valor).padStart(6, '0')}`;
    }
    async criar(input) {
        const protocolo = await this.proximoProtocolo();
        const dataNascimento = input.paciente.dataNascimento
            ? new Date(input.paciente.dataNascimento)
            : new Date(0);
        const dataSolicitacao = input.solicitacao.dataSolicitacao
            ? new Date(input.solicitacao.dataSolicitacao)
            : new Date();
        // tenta vincular paciente existente por CPF
        const pacienteFK = await prisma_2.prisma.paciente.findUnique({
            where: { cpf: input.paciente.cpf },
            select: { id: true },
        });
        const enc = await prisma_2.prisma.encaminhamento.create({
            data: {
                protocolo,
                status: prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO,
                ubsId: input.ubsId,
                atendenteId: input.atendenteId,
                atendenteResponsavel: input.atendenteResponsavel,
                unidadeOrigem: input.unidadeOrigem,
                pacienteId: pacienteFK?.id ?? null,
                pacienteNome: input.paciente.nome,
                pacienteCpf: input.paciente.cpf,
                pacienteCartaoSus: input.paciente.cartaoSus,
                pacienteDataNascimento: dataNascimento,
                pacienteSexo: input.paciente.sexo,
                pacienteTelefone: input.paciente.telefone,
                pacienteEndereco: input.paciente.endereco,
                medicoSolicitante: input.solicitacao.medicoSolicitante,
                crm: input.solicitacao.crm,
                especialidadeSolicitada: input.solicitacao.especialidadeSolicitada,
                cid10: input.solicitacao.cid10,
                cidDescricao: input.solicitacao.cidDescricao,
                justificativaClinica: input.solicitacao.justificativaClinica,
                prioridade: input.solicitacao.prioridade,
                dataSolicitacao,
                anexos: {
                    create: input.anexos.map((a) => ({
                        nome: a.nome,
                        tipo: a.tipo,
                        tamanhoKb: a.tamanhoKb,
                        mimeType: a.mimeType,
                        caminho: a.caminho,
                    })),
                },
                timeline: {
                    create: [
                        {
                            tipo: 'CRIADO',
                            titulo: 'Encaminhamento criado',
                            descricao: `Protocolo ${protocolo} aberto pelo atendente`,
                            autor: input.atendenteResponsavel,
                            autorPapel: `Atendente · ${input.unidadeOrigem}`,
                        },
                        ...input.anexos.map((a) => ({
                            tipo: 'DOCUMENTO_ANEXADO',
                            titulo: 'Documento anexado',
                            descricao: `${a.tipo}: ${a.nome}`,
                            autor: input.atendenteResponsavel,
                            autorPapel: `Atendente · ${input.unidadeOrigem}`,
                        })),
                        {
                            tipo: 'ENVIADO_REGULACAO',
                            titulo: 'Enviado à Regulação',
                            descricao: 'Encaminhamento entrou na fila de regulação',
                            autor: 'SISTEMA',
                            autorPapel: 'Sistema UNISISM',
                        },
                    ],
                },
            },
            include: INCLUDE_FULL,
        });
        return rowParaDominio(enc);
    }
    async buscarPorId(id, ubsId) {
        const r = await prisma_2.prisma.encaminhamento.findFirst({
            where: { id, ubsId },
            include: INCLUDE_FULL,
        });
        return r ? rowParaDominio(r) : null;
    }
    async listar(filtro) {
        const where = { ubsId: filtro.ubsId };
        if (filtro.status)
            where.status = filtro.status;
        if (filtro.pacienteId)
            where.pacienteId = filtro.pacienteId;
        if (filtro.desde || filtro.ate) {
            const range = {};
            if (filtro.desde)
                range.gte = filtro.desde;
            if (filtro.ate)
                range.lte = filtro.ate;
            where.criadoEm = range;
        }
        const rows = await prisma_2.prisma.encaminhamento.findMany({
            where,
            include: INCLUDE_FULL,
            orderBy: { criadoEm: 'desc' },
            take: filtro.limit ?? 100,
        });
        return rows.map(rowParaDominio);
    }
    async resolverPendencia(id, ubsId, input) {
        const atual = await prisma_2.prisma.encaminhamento.findFirst({ where: { id, ubsId } });
        if (!atual)
            throw (0, errors_1.NotFound)('ENCAMINHAMENTO_NAO_ENCONTRADO', 'Encaminhamento não encontrado');
        if (atual.status !== prisma_1.StatusEncaminhamento.PENDENCIA_DOCUMENTO) {
            throw (0, errors_1.Conflict)('ENCAMINHAMENTO_NAO_EM_PENDENCIA', 'Encaminhamento não está em pendência e não pode ser readequado.', { statusAtual: atual.status });
        }
        const resolvido = await prisma_2.prisma.$transaction(async (tx) => {
            // 1. observação
            await tx.eventoTimeline.create({
                data: {
                    encaminhamentoId: id,
                    tipo: 'OBSERVACAO',
                    titulo: 'Pendência respondida pelo atendente',
                    descricao: input.nota,
                    autor: input.autor,
                    autorPapel: input.autorPapel,
                },
            });
            // 2. anexos + eventos por anexo
            for (const a of input.novosAnexos) {
                await tx.anexoDocumento.create({
                    data: {
                        encaminhamentoId: id,
                        nome: a.nome,
                        tipo: a.tipo,
                        tamanhoKb: a.tamanhoKb,
                        mimeType: a.mimeType,
                        caminho: a.caminho,
                    },
                });
                await tx.eventoTimeline.create({
                    data: {
                        encaminhamentoId: id,
                        tipo: 'DOCUMENTO_ANEXADO',
                        titulo: 'Documento anexado',
                        descricao: `${a.tipo}: ${a.nome}`,
                        autor: input.autor,
                        autorPapel: input.autorPapel,
                    },
                });
            }
            // 3. evento de reenvio
            await tx.eventoTimeline.create({
                data: {
                    encaminhamentoId: id,
                    tipo: 'ENVIADO_REGULACAO',
                    titulo: 'Reenviado à Regulação',
                    descricao: 'Pendência respondida; encaminhamento retorna à fila',
                    autor: 'SISTEMA',
                    autorPapel: 'Sistema UNISISM',
                },
            });
            return tx.encaminhamento.update({
                where: { id },
                data: {
                    status: prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO,
                    observacoesRegulacao: '',
                },
                include: INCLUDE_FULL,
            });
        });
        return rowParaDominio(resolvido);
    }
    async metricas(ubsId) {
        const inicioHoje = new Date();
        inicioHoje.setHours(0, 0, 0, 0);
        const inicioSemana = new Date();
        inicioSemana.setHours(0, 0, 0, 0);
        inicioSemana.setDate(inicioSemana.getDate() - 7);
        const [hoje, aguardando, pendencias, aprovadosHoje, semana, todos] = await Promise.all([
            prisma_2.prisma.encaminhamento.count({ where: { ubsId, criadoEm: { gte: inicioHoje } } }),
            prisma_2.prisma.encaminhamento.count({
                where: { ubsId, status: prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO },
            }),
            prisma_2.prisma.encaminhamento.count({
                where: { ubsId, status: prisma_1.StatusEncaminhamento.PENDENCIA_DOCUMENTO },
            }),
            prisma_2.prisma.encaminhamento.count({
                where: {
                    ubsId,
                    status: prisma_1.StatusEncaminhamento.APROVADO,
                    atualizadoEm: { gte: inicioHoje },
                },
            }),
            prisma_2.prisma.encaminhamento.count({ where: { ubsId, criadoEm: { gte: inicioSemana } } }),
            prisma_2.prisma.encaminhamento.findMany({
                where: { ubsId },
                select: { criadoEm: true, atualizadoEm: true },
                take: 200,
                orderBy: { criadoEm: 'desc' },
            }),
        ]);
        const tempos = todos
            .map((e) => Math.max(0, e.atualizadoEm.getTime() - e.criadoEm.getTime()))
            .filter((t) => t > 0);
        const tempoMedioMs = tempos.length
            ? tempos.reduce((a, b) => a + b, 0) / tempos.length
            : 180_000;
        return {
            encaminhamentosHoje: hoje,
            aguardandoRegulacao: aguardando,
            pendenciasDocumento: pendencias,
            aprovadosHoje,
            tempoMedioConsolidacaoSegundos: Math.round(tempoMedioMs / 1000),
            encaminhamentosSemana: semana,
        };
    }
}
exports.PrismaEncaminhamentoRepository = PrismaEncaminhamentoRepository;
//# sourceMappingURL=PrismaEncaminhamentoRepository.js.map