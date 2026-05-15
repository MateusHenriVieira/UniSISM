export interface AccessTokenPayload {
  sub: string; // atendenteId
  role: string;
  ubsId?: string | null;
  prefeituraId?: string | null;
  sid?: string; // sessaoId
}

export interface ITokenService {
  assinarAccess(payload: AccessTokenPayload): string;
  verificarAccess(token: string): AccessTokenPayload;

  gerarRefresh(): { token: string; hash: string; expiraEm: Date };
  hashRefresh(token: string): string;

  ttlAccessSeconds(): number;
}
