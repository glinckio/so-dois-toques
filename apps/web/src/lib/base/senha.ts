export type ForcaDaSenha = { nivel: 0 | 1 | 2 | 3; rotulo: string };

const MINIMO = 10;

/**
 * VIVO-CA-10: força aproximada da senha, só para orientar quem digita. Quem decide
 * se a senha vale é a API (tamanho, senhas comuns, igual ao e-mail).
 */
export function forcaDaSenha(senha: string): ForcaDaSenha {
  if (senha.length < MINIMO) return { nivel: 0, rotulo: "Curta demais" };
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
