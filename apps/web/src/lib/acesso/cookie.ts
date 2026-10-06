export const COOKIE_SESSAO = "sdt_sessao";
const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60;

/**
 * ACESSO-CA-08: o cookie guarda só o token aleatório, fica fora do alcance de
 * JavaScript, vai só por HTTPS em produção e não acompanha requisições de outros sites.
 */
export function opcoesCookieSessao(producao: boolean) {
  return {
    httpOnly: true,
    secure: producao,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SETE_DIAS_EM_SEGUNDOS,
  };
}

/** Rotas que abrem sem sessão. */
export function rotaPublica(caminho: string): boolean {
  return caminho === "/login";
}
