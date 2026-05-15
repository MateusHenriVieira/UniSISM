/**
 * JSON Canonicalization Scheme — RFC 8785.
 *
 * Produz uma serialização determinística (mesmo input ⇒ mesmos bytes) usada
 * pra hash-chain criptográfica em `tfd_audit_log`.
 *
 * Regras implementadas:
 *   - Chaves de objeto ordenadas em ordem lexicográfica de UTF-16 (sort default JS).
 *   - Strings: escape mínimo (`"`, `\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\u00xx`
 *     pra controle), sem espaço supérfluo.
 *   - Números: representação ECMAScript (`Number.prototype.toString`), com
 *     tratamento especial pra `-0` → `0`. NaN/Infinity → erro.
 *   - `undefined` em arrays → `null`; em objetos → chave omitida (igual a JSON.stringify).
 *   - `BigInt` → erro (não é JSON canônico).
 *
 * Não usamos um lib externa pra evitar dependência num módulo que está no
 * caminho de hash criptográfico. Implementação pequena e testada por hand.
 */

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [k: string]: JsonValue | undefined };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function escapeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) out += '\\"';
    else if (c === 0x5c) out += '\\\\';
    else if (c === 0x08) out += '\\b';
    else if (c === 0x09) out += '\\t';
    else if (c === 0x0a) out += '\\n';
    else if (c === 0x0c) out += '\\f';
    else if (c === 0x0d) out += '\\r';
    else if (c < 0x20) out += '\\u' + c.toString(16).padStart(4, '0');
    else out += s[i];
  }
  out += '"';
  return out;
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new Error(`canonicalJson: número não-finito (${n}) não é JSON canônico`);
  }
  if (Object.is(n, -0)) return '0';
  return n.toString();
}

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) {
    throw new Error('canonicalJson: undefined no topo não é serializável');
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return serializeNumber(value);
  if (typeof value === 'bigint') {
    throw new Error('canonicalJson: BigInt não é JSON canônico');
  }
  if (typeof value === 'string') return escapeString(value);

  if (Array.isArray(value)) {
    const parts = value.map((v) => (v === undefined ? 'null' : canonicalJson(v as JsonValue)));
    return '[' + parts.join(',') + ']';
  }

  if (isPlainObject(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    const parts = keys.map((k) => escapeString(k) + ':' + canonicalJson(obj[k] as JsonValue));
    return '{' + parts.join(',') + '}';
  }

  throw new Error(
    `canonicalJson: tipo não suportado (${Object.prototype.toString.call(value)})`,
  );
}
