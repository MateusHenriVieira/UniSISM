export interface IPasswordHasher {
  hash(senha: string): Promise<string>;
  compare(senha: string, hash: string): Promise<boolean>;
}
