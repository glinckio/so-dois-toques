"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";
import { erroComValores } from "./formulario";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const numero = (form: FormData, campo: string) => Number(texto(form, campo) || Number.NaN);

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const CAMPOS_BLOQUEIO = [
  "quadraId",
  "repeticao",
  "data",
  "dataFim",
  "horaInicio",
  "horaFim",
  "motivo",
] as const;

/** FOCO-CA-06: bloqueio avulso ou semanal. */
export async function bloquear(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const semanal = texto(form, "repeticao") === "SEMANAL";
  const quando = semanal
    ? { repeticao: "SEMANAL", dataInicio: texto(form, "data"), dataFim: texto(form, "dataFim") }
    : { repeticao: "AVULSO", data: texto(form, "data") };
  const resposta = await chamarApi<{ id: string; bloqueios: number }>("/horarios/bloqueios", {
    metodo: "POST",
    corpo: {
      ...quando,
      quadraId: texto(form, "quadraId"),
      horaInicio: numero(form, "horaInicio"),
      horaFim: numero(form, "horaFim"),
      motivo: texto(form, "motivo"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_BLOQUEIO);
  redirect(`/horarios/bloqueios/${resposta.dados.id}?criados=${resposta.dados.bloqueios}`);
}

/** FOCO-CA-07 */
export async function cancelarBloqueio(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const bloqueioId = id.safeParse(form.get("bloqueioId"));
  if (!bloqueioId.success) return { erro: "Bloqueio inválido." };
  const resposta = await chamarApi(`/horarios/bloqueios/${bloqueioId.data}/cancelar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Bloqueio cancelado. O horário está livre." };
}

/** FOCO-CA-07: encerra o bloqueio semanal, cancelando as datas que ainda não começaram. */
export async function encerrarSerie(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const serieId = id.safeParse(form.get("serieId"));
  if (!serieId.success) return { erro: "Bloqueio semanal inválido." };
  const resposta = await chamarApi<{ cancelados: number }>(
    `/horarios/series/${serieId.data}/encerrar`,
    { metodo: "POST", corpo: {} },
  );
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  const { cancelados } = resposta.dados;
  return {
    sucesso: `Bloqueio semanal encerrado: ${cancelados} ${cancelados === 1 ? "data liberada" : "datas liberadas"}.`,
  };
}

/** GASTO-CA-01: quadra nova. */
export async function criarQuadra(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const resposta = await chamarApi("/horarios/quadras", {
    metodo: "POST",
    corpo: { nome: texto(form, "nome") },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, ["nome"]);
  refresh();
  return { sucesso: "Quadra cadastrada." };
}

/** GASTO-CA-01: renomear, desativar ou reativar a quadra. */
export async function alterarQuadra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const quadraId = id.safeParse(form.get("quadraId"));
  if (!quadraId.success) return { erro: "Quadra inválida." };
  const resposta = await chamarApi(`/horarios/quadras/${quadraId.data}`, {
    metodo: "PATCH",
    corpo: { nome: texto(form, "nome"), ativa: form.get("ativa") === "on" },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, ["nome"]);
  refresh();
  return { sucesso: "Quadra salva." };
}
