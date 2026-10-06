import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";

/** Parâmetros mínimos recomendados pelo OWASP para Argon2id. */
// algorithm 2 = Argon2id (o enum é "const enum" e não pode ser importado com isolatedModules).
const OPCOES = { algorithm: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

let hashFicticio: Promise<string> | undefined;

/**
 * Verifica a senha. Sem hash (usuário inexistente) compara com um hash fictício,
 * para que o tempo de resposta seja o mesmo nos dois casos (ACESSO-CA-02).
 */
export async function verificarSenha(senha: string, senhaHash: string | null): Promise<boolean> {
  hashFicticio ??= gerarHashSenha(randomBytes(16).toString("hex"));
  const alvo = senhaHash ?? (await hashFicticio);
  try {
    const confere = await verify(alvo, senha);
    return senhaHash !== null && confere;
  } catch {
    return false;
  }
}
