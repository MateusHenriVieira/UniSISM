export interface CriarSessaoInput {
  atendenteId: string;
  refreshTokenHash: string;
  expiraEm: Date;
  ip?: string;
  userAgent?: string;
  dispositivo?: string;
  local?: string;
}

export interface SessaoRegistrada {
  sessaoId: string;
  refreshTokenId: string;
}

export interface ISessaoRepository {
  criar(input: CriarSessaoInput): Promise<SessaoRegistrada>;
  buscarPorRefreshHash(hash: string): Promise<{ atendenteId: string; sessaoId: string } | null>;
  revogarPorRefreshHash(hash: string): Promise<void>;
  revogarOutras(atendenteId: string, sessaoIdAtual: string): Promise<number>;
  revogarTodas(atendenteId: string): Promise<void>;
  contarAtivas(atendenteId: string): Promise<number>;
}
