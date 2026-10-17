"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";
import { erroComValores } from "./formulario";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "");

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const CAMPOS_RESPOSTA = ["nota", "comentario", "melhoria", "turmaId", "nome"] as const;

/** FEED-CA-01 e 03: o formulário público, sem sessão. */
export async function enviarFeedback(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const nota = Number(texto(form, "nota"));
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return erroComValores({ erro: "Escolha uma nota de 1 a 5." }, form, CAMPOS_RESPOSTA);
  }
  const turmaId = texto(form, "turmaId");
  const resposta = await chamarApi("/feedback/respostas", {
    metodo: "POST",
    sessao: false,
    corpo: {
      nota,
      comentario: texto(form, "comentario") || null,
      melhoria: texto(form, "melhoria") || null,
      turmaId: turmaId || null,
      nome: texto(form, "nome") || null,
      site: texto(form, "site") || null,
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_RESPOSTA);
  return { sucesso: "Obrigado! Sua resposta foi enviada." };
}

/** FEED-CA-06 */
export async function marcarFeedbackLido(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const respostaId = id.safeParse(form.get("respostaId"));
  if (!respostaId.success) return { erro: "Resposta inválida." };
  const resposta = await chamarApi(`/feedback/respostas/${respostaId.data}/lida`, {
    metodo: "POST",
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

/** FEED-CA-06 */
export async function marcarTodosFeedbacksLidos(): Promise<EstadoFormulario> {
  const resposta = await chamarApi<{ marcadas: number }>("/feedback/respostas/lidas", {
    metodo: "POST",
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Todas as respostas foram marcadas como lidas." };
}

/** FEED-CA-07 */
export async function removerFeedback(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const respostaId = id.safeParse(form.get("respostaId"));
  if (!respostaId.success) return { erro: "Resposta inválida." };
  const resposta = await chamarApi(`/feedback/respostas/${respostaId.data}`, {
    metodo: "DELETE",
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Resposta removida." };
}

/** FEED-CA-04 e 07 */
export async function pausarFeedback(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const pausado = form.get("pausado") === "true";
  const resposta = await chamarApi("/feedback/formulario", {
    metodo: "POST",
    corpo: { pausado },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {
    sucesso: pausado
      ? "Formulário pausado: ninguém consegue responder até você retomar."
      : "Formulário retomado: o link voltou a receber respostas.",
  };
}
