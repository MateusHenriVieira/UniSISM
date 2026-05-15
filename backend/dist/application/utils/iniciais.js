"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iniciais = iniciais;
function iniciais(nome) {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0)
        return '';
    if (partes.length === 1)
        return (partes[0] ?? '').slice(0, 2).toUpperCase();
    const primeira = (partes[0] ?? '')[0] ?? '';
    const ultima = (partes[partes.length - 1] ?? '')[0] ?? '';
    return `${primeira}${ultima}`.toUpperCase();
}
//# sourceMappingURL=iniciais.js.map