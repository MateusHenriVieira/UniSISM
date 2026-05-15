"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiskFileStorage = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("../../shared/env");
class DiskFileStorage {
    root = node_path_1.default.resolve(process.cwd(), env_1.env.UPLOAD_DIR);
    async garantirPasta(pasta) {
        const abs = node_path_1.default.join(this.root, pasta);
        await promises_1.default.mkdir(abs, { recursive: true });
        return abs;
    }
    async salvar(input) {
        const abs = await this.garantirPasta(input.pasta);
        const ext = node_path_1.default.extname(input.nomeOriginal) || '';
        const nomeSeguro = node_crypto_1.default.randomBytes(16).toString('hex') + ext;
        const destino = node_path_1.default.join(abs, nomeSeguro);
        await promises_1.default.writeFile(destino, input.buffer);
        return {
            caminho: node_path_1.default.posix.join(input.pasta, nomeSeguro),
            tamanhoKb: Math.max(1, Math.round(input.buffer.byteLength / 1024)),
        };
    }
    caminhoAbsoluto(caminho) {
        return node_path_1.default.join(this.root, caminho);
    }
}
exports.DiskFileStorage = DiskFileStorage;
//# sourceMappingURL=DiskFileStorage.js.map