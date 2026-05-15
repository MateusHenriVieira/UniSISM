"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPacienteRepository = void 0;
const prisma_1 = require("../../../generated/prisma");
const prisma_2 = require("./prisma");
const mappers_1 = require("./mappers");
function rowParaResumo(r) {
    const ultimoAt = r.atendimentos[0]?.data;
    const resumo = {
        id: r.id,
        nome: r.nome,
        cpf: r.cpf,
        cartaoSus: r.cartaoSus,
        dataNascimento: (0, mappers_1.ymd)(r.dataNascimento),
        sexo: r.sexo,
        telefone: r.telefone ?? '',
        unidadeVinculada: r.ubs.nome,
        condicoesCronicasAtivas: r._count.condicoesCronicas,
        encaminhamentosAtivos: r._count.encaminhamentos,
        cadastradoEm: (0, mappers_1.ymd)(r.cadastradoEm),
    };
    if (r.nomeSocial)
        resumo.nomeSocial = r.nomeSocial;
    if (r.equipeSaudeFamilia)
        resumo.equipeSaudeFamilia = r.equipeSaudeFamilia;
    if (ultimoAt)
        resumo.ultimoAtendimento = ultimoAt.toISOString();
    return resumo;
}
class PrismaPacienteRepository {
    async listar(filtro) {
        const where = { ubsId: filtro.ubsId };
        if (filtro.q && filtro.q.trim().length > 0) {
            const q = filtro.q.trim();
            where.OR = [
                { nome: { contains: q, mode: 'insensitive' } },
                { nomeSocial: { contains: q, mode: 'insensitive' } },
                { cpf: { contains: q } },
                { cartaoSus: { contains: q } },
                { equipeSaudeFamilia: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (filtro.equipeId)
            where.equipeSaudeFamilia = filtro.equipeId;
        if (filtro.microarea)
            where.microarea = filtro.microarea;
        if (filtro.filtro === 'COM_CRONICAS') {
            where.condicoesCronicas = { some: { ativo: true } };
        }
        else if (filtro.filtro === 'COM_ENCAMINHAMENTOS') {
            where.encaminhamentos = {
                some: {
                    status: { in: [prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO, prisma_1.StatusEncaminhamento.PENDENCIA_DOCUMENTO] },
                },
            };
        }
        else if (filtro.filtro === 'SEM_ATENDIMENTO_90D') {
            const limite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            where.OR = [
                { atendimentos: { none: {} } },
                { atendimentos: { every: { data: { lt: limite } } } },
            ];
        }
        const rows = await prisma_2.prisma.paciente.findMany({
            where,
            include: {
                ubs: { select: { nome: true } },
                _count: {
                    select: {
                        condicoesCronicas: { where: { ativo: true } },
                        encaminhamentos: {
                            where: {
                                status: {
                                    in: [prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO, prisma_1.StatusEncaminhamento.PENDENCIA_DOCUMENTO],
                                },
                            },
                        },
                    },
                },
                atendimentos: { orderBy: { data: 'desc' }, take: 1, select: { data: true } },
            },
            orderBy: { nome: 'asc' },
            take: 200,
        });
        return rows.map(rowParaResumo);
    }
    async buscarPorId(id, ubsId) {
        const r = await prisma_2.prisma.paciente.findFirst({
            where: { id, ubsId },
            include: {
                ubs: { select: { nome: true } },
                alergias: true,
                condicoesCronicas: true,
                medicamentosEmUso: true,
                atendimentos: { orderBy: { data: 'desc' }, take: 50 },
                viagensTFD: { orderBy: { dataIda: 'desc' }, take: 50 },
                exames: { orderBy: { data: 'desc' }, take: 50 },
                vacinacoes: { orderBy: { data: 'desc' }, take: 50 },
                medicosAtendentes: { orderBy: { ultimaConsulta: 'desc' } },
                encaminhamentos: { select: { id: true } },
                _count: {
                    select: {
                        condicoesCronicas: { where: { ativo: true } },
                        encaminhamentos: {
                            where: {
                                status: {
                                    in: [prisma_1.StatusEncaminhamento.AGUARDANDO_REGULACAO, prisma_1.StatusEncaminhamento.PENDENCIA_DOCUMENTO],
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!r)
            return null;
        const ultimoAt = r.atendimentos[0]?.data;
        const completo = {
            id: r.id,
            nome: r.nome,
            cpf: r.cpf,
            cartaoSus: r.cartaoSus,
            dataNascimento: (0, mappers_1.ymd)(r.dataNascimento),
            sexo: r.sexo,
            telefone: r.telefone ?? '',
            unidadeVinculada: r.ubs.nome,
            condicoesCronicasAtivas: r._count.condicoesCronicas,
            encaminhamentosAtivos: r._count.encaminhamentos,
            cadastradoEm: (0, mappers_1.ymd)(r.cadastradoEm),
            nomeMae: r.nomeMae ?? '',
            estadoCivil: r.estadoCivil,
            escolaridade: r.escolaridade ?? '',
            racaCor: r.racaCor,
            endereco: r.endereco ?? '',
            bairro: r.bairro ?? '',
            municipio: r.municipio ?? '',
            uf: r.uf ?? '',
            cep: r.cep ?? '',
            grupoSanguineo: (0, mappers_1.grupoSanguineoToDominio)(r.grupoSanguineo),
            historicoFamiliar: r.historicoFamiliar,
            alergias: r.alergias.map((a) => ({
                substancia: a.substancia,
                tipo: a.tipo,
                gravidade: a.gravidade,
                ...(a.observacao ? { observacao: a.observacao } : {}),
            })),
            condicoesCronicas: r.condicoesCronicas.map((c) => ({
                cid10: c.cid10,
                descricao: c.descricao,
                desde: (0, mappers_1.ymd)(c.desde),
                ativo: c.ativo,
                ...(c.observacao ? { observacao: c.observacao } : {}),
            })),
            medicamentosEmUso: r.medicamentosEmUso.map((m) => ({
                nome: m.nome,
                dosagem: m.dosagem,
                frequencia: m.frequencia,
                desde: (0, mappers_1.ymd)(m.desde),
                prescritor: m.prescritor,
                ativo: m.ativo,
            })),
            atendimentos: r.atendimentos.map((a) => ({
                id: a.id,
                data: a.data.toISOString(),
                tipo: a.tipo,
                profissional: a.profissional,
                registroProfissional: a.registroProfissional,
                especialidade: a.especialidade,
                unidade: a.unidade,
                queixaPrincipal: a.queixaPrincipal,
                diagnostico: a.diagnostico,
                cid10: a.cid10,
                conduta: a.conduta,
                ...(a.prescricaoResumo ? { prescricaoResumo: a.prescricaoResumo } : {}),
            })),
            viagensTFD: r.viagensTFD.map((v) => ({
                id: v.id,
                protocolo: v.protocolo,
                dataIda: v.dataIda.toISOString(),
                dataVolta: v.dataVolta.toISOString(),
                destino: v.destino,
                unidadeDestino: v.unidadeDestino,
                motivo: v.motivo,
                especialidade: v.especialidade,
                acompanhante: v.acompanhante,
                transporte: v.transporte,
                status: v.status,
                custoEstimadoBRL: v.custoEstimadoBRL,
            })),
            exames: r.exames.map((e) => ({
                id: e.id,
                data: e.data.toISOString(),
                tipo: e.tipo,
                categoria: e.categoria,
                solicitante: e.solicitante,
                unidadeExecutora: e.unidadeExecutora,
                resultado: e.resultado,
                ...(e.observacao ? { observacao: e.observacao } : {}),
            })),
            vacinacoes: r.vacinacoes.map((v) => ({
                id: v.id,
                data: v.data.toISOString(),
                vacina: v.vacina,
                dose: v.dose,
                lote: v.lote,
                aplicador: v.aplicador,
                unidade: v.unidade,
                via: v.via,
            })),
            medicosAtendentes: r.medicosAtendentes.map((m) => ({
                nome: m.nome,
                registro: m.registro,
                especialidade: m.especialidade,
                unidade: m.unidade,
                ultimaConsulta: m.ultimaConsulta.toISOString(),
                totalConsultas: m.totalConsultas,
            })),
            encaminhamentosIds: r.encaminhamentos.map((e) => e.id),
        };
        if (r.nomeSocial)
            completo.nomeSocial = r.nomeSocial;
        if (r.equipeSaudeFamilia)
            completo.equipeSaudeFamilia = r.equipeSaudeFamilia;
        if (ultimoAt)
            completo.ultimoAtendimento = ultimoAt.toISOString();
        if (r.nomePai)
            completo.nomePai = r.nomePai;
        if (r.profissao)
            completo.profissao = r.profissao;
        if (r.telefoneSecundario)
            completo.telefoneSecundario = r.telefoneSecundario;
        if (r.email)
            completo.email = r.email;
        if (r.agenteComunitario)
            completo.agenteComunitario = r.agenteComunitario;
        if (r.microarea)
            completo.microarea = r.microarea;
        return completo;
    }
}
exports.PrismaPacienteRepository = PrismaPacienteRepository;
//# sourceMappingURL=PrismaPacienteRepository.js.map