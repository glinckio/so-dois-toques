"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_SESSAO, opcoesCookieSessao } from "@/lib/acesso/cookie";
import { chamarApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  senha: z.string().min(1).max(1024),
});

type RespostaLogin = { token: string; usuario: { trocarSenha: boolean } };

export async function entrar(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dados = loginSchema.safeParse({ email: form.get("email"), senha: form.get("senha") });
  if (!dados.success) return { erro: "Informe o e-mail e a senha." };

  const resposta = await chamarApi<RespostaLogin>("/auth/login", {
    metodo: "POST",
    corpo: dados.data,
    sessao: false,
  });
  if (!resposta.ok) return { erro: resposta.mensagem, email: dados.data.email };

  (await cookies()).set(
    COOKIE_SESSAO,
    resposta.dados.token,
    opcoesCookieSessao(process.env.NODE_ENV === "production"),
  );
  redirect(resposta.dados.usuario.trocarSenha ? "/trocar-senha" : "/");
}

export async function sair(): Promise<void> {
  try {
    await chamarApi("/auth/logout", { metodo: "POST" });
  } finally {
    (await cookies()).delete(COOKIE_SESSAO);
  }
  redirect("/login");
}

const trocaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual.").max(1024),
    novaSenha: z.string().min(1, "Informe a nova senha.").max(1024),
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, {
    message: "A confirmação não confere com a nova senha.",
  });

export async function trocarSenha(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dados = trocaSchema.safeParse({
    senhaAtual: form.get("senhaAtual"),
    novaSenha: form.get("novaSenha"),
    confirmacao: form.get("confirmacao"),
  });
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const resposta = await chamarApi("/auth/senha", {
    metodo: "POST",
    corpo: { senhaAtual: dados.data.senhaAtual, novaSenha: dados.data.novaSenha },
  });
  if (!resposta.ok) return { erro: resposta.mensagem };
  redirect("/?senha=trocada");
}
