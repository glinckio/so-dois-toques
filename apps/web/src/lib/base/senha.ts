export type ForcaDaSenha = { nivel: 0 | 1 | 2 | 3; rotulo: string };

/** Os mesmos limites da API (SENHA_MINIMO e SENHA_MAXIMO); um teste confere. */
export const LIMITES_DA_SENHA = { minimo: 10, maximo: 128 } as const;

/**
 * VIVO-CA-10: força aproximada da senha, só para orientar quem digita. Quem decide
 * se a senha vale é a API (tamanho, senhas comuns, igual ao e-mail).
 */
export function forcaDaSenha(senha: string): ForcaDaSenha {
  if (senha.length < LIMITES_DA_SENHA.minimo) return { nivel: 0, rotulo: "Curta demais" };
  if (senha.length > LIMITES_DA_SENHA.maximo) return { nivel: 0, rotulo: "Longa demais" };
  if (new Set(senha.toLowerCase()).size <= 2) return { nivel: 0, rotulo: "Fraca" };
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(senha)).length;
  let pontos = 0;
  if (senha.length >= 14) pontos += 1;
  if (senha.length >= 18) pontos += 1;
  if (tipos >= 2) pontos += 1;
  if (tipos >= 3) pontos += 1;
  if (pontos >= 3) return { nivel: 3, rotulo: "Forte" };
  if (pontos >= 2) return { nivel: 2, rotulo: "Boa" };
  return { nivel: 1, rotulo: "Razoável" };
}
