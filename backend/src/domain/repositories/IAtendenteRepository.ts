import type { Atendente, Ubs, Prefeitura } from '../../../generated/prisma';
import type { RoleAtendente } from '../entities/Atendente';

export type AtendenteComEscopo = Atendente & {
  ubs: (Ubs & { prefeitura: Prefeitura }) | null;
  prefeitura: Prefeitura | null;
};

// alias mantido por compat com chamadas existentes
export type AtendenteComUbs = AtendenteComEscopo;

export interface IAtendenteRepository {
  buscarPorLogin(login: string): Promise<AtendenteComEscopo | null>;
  buscarPorId(id: string): Promise<AtendenteComEscopo | null>;
  buscarPorEmail(email: string): Promise<AtendenteComEscopo | null>;
  atualizarSenha(id: string, senhaHash: string): Promise<void>;
  registrarTentativaLogin(params: {
    login: string;
    atendenteId?: string;
    sucesso: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<void>;
  contarTentativasFalhas(login: string, janelaMinutos: number): Promise<number>;
  bloquearAte(id: string, ate: Date): Promise<void>;
  registrarAtividade(atendenteId: string, acao: string, alvo?: string): Promise<void>;
  atualizarRole(id: string, role: RoleAtendente): Promise<void>;
}
