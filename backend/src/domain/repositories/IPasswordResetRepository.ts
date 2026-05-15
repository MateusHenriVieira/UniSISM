export interface IPasswordResetRepository {
  criar(input: {
    atendenteId: string;
    codigoHash: string;
    expiraEm: Date;
  }): Promise<{ id: string }>;
  buscarVigentePorAtendente(atendenteId: string): Promise<{
    id: string;
    codigoHash: string;
    tentativas: number;
    expiraEm: Date;
  } | null>;
  incrementarTentativas(id: string): Promise<void>;
  vincularResetToken(id: string, resetToken: string): Promise<void>;
  buscarPorResetToken(token: string): Promise<{
    id: string;
    atendenteId: string;
    expiraEm: Date;
    consumidoEm: Date | null;
  } | null>;
  consumir(id: string): Promise<void>;
  solicitacoesRecentes(atendenteId: string, janelaSegundos: number): Promise<number>;
}
