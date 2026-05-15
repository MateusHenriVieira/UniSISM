export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) return (partes[0] ?? '').slice(0, 2).toUpperCase();
  const primeira = (partes[0] ?? '')[0] ?? '';
  const ultima = (partes[partes.length - 1] ?? '')[0] ?? '';
  return `${primeira}${ultima}`.toUpperCase();
}
