"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grupoSanguineoToDominio = grupoSanguineoToDominio;
exports.grupoSanguineoToPrisma = grupoSanguineoToPrisma;
exports.isoOrEmpty = isoOrEmpty;
exports.ymd = ymd;
const prisma_1 = require("../../../generated/prisma");
const sanguePrismaParaDominio = {
    [prisma_1.GrupoSanguineo.A_POSITIVO]: 'A+',
    [prisma_1.GrupoSanguineo.A_NEGATIVO]: 'A-',
    [prisma_1.GrupoSanguineo.B_POSITIVO]: 'B+',
    [prisma_1.GrupoSanguineo.B_NEGATIVO]: 'B-',
    [prisma_1.GrupoSanguineo.AB_POSITIVO]: 'AB+',
    [prisma_1.GrupoSanguineo.AB_NEGATIVO]: 'AB-',
    [prisma_1.GrupoSanguineo.O_POSITIVO]: 'O+',
    [prisma_1.GrupoSanguineo.O_NEGATIVO]: 'O-',
    [prisma_1.GrupoSanguineo.NAO_INFORMADO]: 'NAO_INFORMADO',
};
const sangueDominioParaPrisma = {
    'A+': prisma_1.GrupoSanguineo.A_POSITIVO,
    'A-': prisma_1.GrupoSanguineo.A_NEGATIVO,
    'B+': prisma_1.GrupoSanguineo.B_POSITIVO,
    'B-': prisma_1.GrupoSanguineo.B_NEGATIVO,
    'AB+': prisma_1.GrupoSanguineo.AB_POSITIVO,
    'AB-': prisma_1.GrupoSanguineo.AB_NEGATIVO,
    'O+': prisma_1.GrupoSanguineo.O_POSITIVO,
    'O-': prisma_1.GrupoSanguineo.O_NEGATIVO,
    NAO_INFORMADO: prisma_1.GrupoSanguineo.NAO_INFORMADO,
};
function grupoSanguineoToDominio(g) {
    return sanguePrismaParaDominio[g];
}
function grupoSanguineoToPrisma(g) {
    return sangueDominioParaPrisma[g];
}
function isoOrEmpty(d) {
    return d ? d.toISOString() : '';
}
function ymd(d) {
    if (!d)
        return '';
    return d.toISOString().slice(0, 10);
}
//# sourceMappingURL=mappers.js.map