import type { GrupoSanguineo as GrupoDominio } from '../../domain/entities/Paciente';
import { GrupoSanguineo as GrupoPrisma } from '../../../generated/prisma';

const sanguePrismaParaDominio: Record<GrupoPrisma, GrupoDominio> = {
  [GrupoPrisma.A_POSITIVO]: 'A+',
  [GrupoPrisma.A_NEGATIVO]: 'A-',
  [GrupoPrisma.B_POSITIVO]: 'B+',
  [GrupoPrisma.B_NEGATIVO]: 'B-',
  [GrupoPrisma.AB_POSITIVO]: 'AB+',
  [GrupoPrisma.AB_NEGATIVO]: 'AB-',
  [GrupoPrisma.O_POSITIVO]: 'O+',
  [GrupoPrisma.O_NEGATIVO]: 'O-',
  [GrupoPrisma.NAO_INFORMADO]: 'NAO_INFORMADO',
};

const sangueDominioParaPrisma: Record<GrupoDominio, GrupoPrisma> = {
  'A+': GrupoPrisma.A_POSITIVO,
  'A-': GrupoPrisma.A_NEGATIVO,
  'B+': GrupoPrisma.B_POSITIVO,
  'B-': GrupoPrisma.B_NEGATIVO,
  'AB+': GrupoPrisma.AB_POSITIVO,
  'AB-': GrupoPrisma.AB_NEGATIVO,
  'O+': GrupoPrisma.O_POSITIVO,
  'O-': GrupoPrisma.O_NEGATIVO,
  NAO_INFORMADO: GrupoPrisma.NAO_INFORMADO,
};

export function grupoSanguineoToDominio(g: GrupoPrisma): GrupoDominio {
  return sanguePrismaParaDominio[g];
}

export function grupoSanguineoToPrisma(g: GrupoDominio): GrupoPrisma {
  return sangueDominioParaPrisma[g];
}

export function isoOrEmpty(d: Date | null | undefined): string {
  return d ? d.toISOString() : '';
}

export function ymd(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}
