/**
 * Parser de datas tolerante.
 *
 * Aceita:
 *   "2026-04-23"            → ISO date
 *   "2026-04-23T00:00:00Z"  → ISO datetime
 *   "23/04/2026"            → BR
 *   "23-04-2026"            → BR com hífen
 *   "23.04.2026"            → BR com ponto
 *   "23/04/26"              → BR ano 2 dígitos (assume 2000+)
 *   ""                      → null (vazio)
 *   null/undefined          → null
 *
 * Retorna null pra qualquer entrada que não case com os padrões acima
 * OU produza Invalid Date.
 */

const REGEXES = [
  // YYYY-MM-DD ou variações ISO
  /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/,
  // DD/MM/YY (assume 20YY)
  /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})$/,
];

export function parseDataFlexivel(input: unknown): Date | null {
  if (input == null) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== 'string') return null;
  const t = input.trim();
  if (!t) return null;

  // 1) YYYY-MM-DD (ISO)
  let m = REGEXES[0]?.exec(t);
  if (m) {
    const [, y, mo, d] = m;
    return tentarISO(`${y}-${pad(mo!)}-${pad(d!)}T00:00:00.000Z`);
  }

  // 2) DD/MM/YYYY
  m = REGEXES[1]?.exec(t);
  if (m) {
    const [, d, mo, y] = m;
    return tentarISO(`${y}-${pad(mo!)}-${pad(d!)}T00:00:00.000Z`);
  }

  // 3) DD/MM/YY (assume 20YY se >= 0, ou 19YY se > 50 — heurística simples)
  m = REGEXES[2]?.exec(t);
  if (m) {
    const [, d, mo, yy] = m;
    const ano = Number(yy) < 30 ? `20${yy}` : `19${yy}`;
    return tentarISO(`${ano}-${pad(mo!)}-${pad(d!)}T00:00:00.000Z`);
  }

  // 4) Última tentativa: deixar o construtor do Date tentar
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(s: string): string {
  return s.length === 1 ? `0${s}` : s;
}

function tentarISO(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formata uma Date para "YYYY-MM-DD" (UTC). */
export function ymdISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
