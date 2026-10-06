import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Area, Perfil } from "@/lib/acesso/areas";
import { COOKIE_SESSAO } from "@/lib/acesso/cookie";
import { chamarApi } from "./api";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  trocarSenha: boolean;
  areas: Area[];
};

/** Usuário da sessão atual, consultado uma vez por requisição. */
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  if (!(await cookies()).has(COOKIE_SESSAO)) return null;
  const resposta = await chamarApi<Usuario>("/auth/eu");
  return resposta.ok ? resposta.dados : null;
});

/** ACESSO-CA-05 e 13: sem sessão vai para o login; com senha temporária, para a troca. */
export async function exigirUsuario(
  opcoes: { permitirTrocaPendente?: boolean } = {},
): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  if (usuario.trocarSenha && !opcoes.permitirTrocaPendente) redirect("/trocar-senha");
  return usuario;
}

/**
 * ACESSO-CA-10: a API decide se o perfil acessa a área e registra a negação na
 * auditoria, mesmo quando a pessoa digita o endereço direto.
 */
export async function exigirArea(area: Area): Promise<{ usuario: Usuario; permitido: boolean }> {
  const usuario = await exigirUsuario();
  const resposta = await chamarApi<{ permitido: boolean }>(`/acesso/${area}`);
  return { usuario, permitido: resposta.ok && resposta.dados.permitido };
}
