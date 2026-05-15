"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginUseCase = void 0;
const errors_1 = require("../../shared/errors");
const iniciais_1 = require("../utils/iniciais");
class LoginUseCase {
    atendentes;
    sessoes;
    hasher;
    tokens;
    constructor(atendentes, sessoes, hasher, tokens) {
        this.atendentes = atendentes;
        this.sessoes = sessoes;
        this.hasher = hasher;
        this.tokens = tokens;
    }
    async exec(input) {
        const atendente = await this.atendentes.buscarPorLogin(input.login);
        if (!atendente) {
            await this.atendentes.registrarTentativaLogin({
                login: input.login,
                sucesso: false,
                ...(input.ip ? { ip: input.ip } : {}),
                ...(input.userAgent ? { userAgent: input.userAgent } : {}),
            });
            throw (0, errors_1.Unauthorized)('CREDENCIAIS_INVALIDAS', 'Login ou senha inválidos');
        }
        if (!atendente.ativo) {
            throw (0, errors_1.Forbidden)('USUARIO_INATIVO', 'Usuário inativo');
        }
        if (atendente.bloqueadoAte && atendente.bloqueadoAte > new Date()) {
            throw (0, errors_1.Forbidden)('USUARIO_BLOQUEADO', 'Usuário temporariamente bloqueado');
        }
        const ok = await this.hasher.compare(input.senha, atendente.senhaHash);
        if (!ok) {
            await this.atendentes.registrarTentativaLogin({
                login: input.login,
                atendenteId: atendente.id,
                sucesso: false,
                ...(input.ip ? { ip: input.ip } : {}),
                ...(input.userAgent ? { userAgent: input.userAgent } : {}),
            });
            const falhas = await this.atendentes.contarTentativasFalhas(input.login, 15);
            if (falhas >= 5) {
                await this.atendentes.bloquearAte(atendente.id, new Date(Date.now() + 30 * 60_000));
            }
            throw (0, errors_1.Unauthorized)('CREDENCIAIS_INVALIDAS', 'Login ou senha inválidos');
        }
        // Política simples: senhas com mais de 180 dias forçam troca
        const limiteSenha = 180 * 24 * 60 * 60 * 1000;
        if (Date.now() - atendente.senhaAlteradaEm.getTime() > limiteSenha) {
            throw (0, errors_1.Unprocessable)('SENHA_EXPIRADA', 'Senha expirada — troque sua senha');
        }
        const refresh = this.tokens.gerarRefresh();
        const sessao = await this.sessoes.criar({
            atendenteId: atendente.id,
            refreshTokenHash: refresh.hash,
            expiraEm: refresh.expiraEm,
            ...(input.ip ? { ip: input.ip } : {}),
            ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        });
        const accessToken = this.tokens.assinarAccess({
            sub: atendente.id,
            ubsId: atendente.ubsId,
            role: atendente.role,
            sid: sessao.sessaoId,
        });
        await this.atendentes.registrarTentativaLogin({
            login: input.login,
            atendenteId: atendente.id,
            sucesso: true,
            ...(input.ip ? { ip: input.ip } : {}),
            ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        });
        await this.atendentes.registrarAtividade(atendente.id, 'Login efetuado');
        return {
            token: accessToken,
            refreshToken: refresh.token,
            expiresIn: this.tokens.ttlAccessSeconds(),
            atendente: {
                id: atendente.id,
                nome: atendente.nome,
                matricula: atendente.matricula,
                iniciais: (0, iniciais_1.iniciais)(atendente.nome),
            },
        };
    }
}
exports.LoginUseCase = LoginUseCase;
//# sourceMappingURL=LoginUseCase.js.map