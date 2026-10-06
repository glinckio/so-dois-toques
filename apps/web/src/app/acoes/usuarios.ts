"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PERFIS } from "@/lib/acesso/areas";
import { chamarApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";

const perfil = z.enum(Object.keys(PERFIS) as [keyof typeof PERFIS, ...(keyof typeof PERFIS)[]], {
  error: "Escolha um perfil.",
});
const id = z.uuid();

const criarSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  email: z.email("E-mail inválido.").max(254),
  perfil,
});

function mensagem(resposta: { mensagem: string; campos?: { mensagem: string }[] }) {
  return resposta.campos?.[0]?.mensagem ?? resposta.mensagem;
}

// A permissão de cada ação é conferida pela API (perfil Administrador).

export async function criarUsuario(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dados = criarSchema.safeParse({
    nome: form.get("nome"),
    email: String(form.get("email") ?? "").trim(),
    perfil: form.get("perfil"),
  });
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const resposta = await chamarApi<{ usuario: { email: string }; senhaTemporaria: string }>(
    "/usuarios",
    {
      metodo: "POST",
      corpo: dados.data,
    },
  );
  if (!resposta.ok) return { erro: mensagem(resposta) };
  refresh();
  return {
    sucesso: `Usuário ${resposta.dados.usuario.email} cadastrado.`,
    senhaTemporaria: resposta.dados.senhaTemporaria,
    email: resposta.dados.usuario.email,
  };
}

export async function alterarPerfil(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const dados = z
    .object({ id, perfil })
    .safeParse({ id: form.get("id"), perfil: form.get("perfil") });
  if (!dados.success) return { erro: "Dados inválidos." };
  const resposta = await chamarApi(`/usuarios/${dados.data.id}/perfil`, {
    metodo: "PATCH",
    corpo: { perfil: dados.data.perfil },
  });
  if (!resposta.ok) return { erro: mensagem(resposta) };
  refresh();
  return { sucesso: `Perfil alterado para ${PERFIS[dados.data.perfil]}.` };
}

export async function redefinirSenha(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const dados = id.safeParse(form.get("id"));
  if (!dados.success) return { erro: "Dados inválidos." };
  const resposta = await chamarApi<{ senhaTemporaria: string }>(
    `/usuarios/${dados.data}/redefinir-senha`,
    {
      metodo: "POST",
    },
  );
  if (!resposta.ok) return { erro: mensagem(resposta) };
  return {
    sucesso: "Nova senha temporária gerada.",
    senhaTemporaria: resposta.dados.senhaTemporaria,
  };
}

export async function desativarUsuario(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const dados = id.safeParse(form.get("id"));
  if (!dados.success) return { erro: "Dados inválidos." };
  const resposta = await chamarApi(`/usuarios/${dados.data}/desativar`, { metodo: "POST" });
  if (!resposta.ok) return { erro: mensagem(resposta) };
  refresh();
  return { sucesso: "Usuário desativado." };
}
