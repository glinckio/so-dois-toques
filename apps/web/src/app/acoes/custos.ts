"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { centavosDe } from "@/lib/mensalidades/formatacao";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";
import { erroComValores } from "./formulario";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const CAMPOS_VALOR_HORA = ["valorHora"] as const;
const CAMPOS_PAGAMENTO = ["valor", "forma", "data"] as const;

/** CUSTO-CA-01: valor vazio apaga o valor da hora. */
export async function definirValorHora(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const localId = id.safeParse(form.get("localId"));
  if (!localId.success) return { erro: "Local inválido." };
  const digitado = texto(form, "valorHora");
  const valorHoraCentavos = digitado ? centavosDe(digitado) : null;
  if (digitado && valorHoraCentavos === null) {
    return erroComValores(
      { erro: "Valor inválido: use o formato 80,00." },
      form,
      CAMPOS_VALOR_HORA,
    );
  }
  const resposta = await chamarApi(`/locais/${localId.data}/valor-hora`, {
    metodo: "PUT",
    corpo: { valorHoraCentavos },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_VALOR_HORA);
  refresh();
  return {
    sucesso: valorHoraCentavos === null ? "Valor da hora apagado." : "Valor da hora salvo.",
  };
}

/** CUSTO-CA-03: pagamento à quadra, que sai do Caixa. */
export async function registrarPagamentoQuadra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const localId = id.safeParse(form.get("localId"));
  if (!localId.success) return { erro: "Local inválido." };
  const valorCentavos = centavosDe(texto(form, "valor"));
  if (valorCentavos === null) {
    return erroComValores(
      { erro: "Valor inválido: use o formato 150,00." },
      form,
      CAMPOS_PAGAMENTO,
    );
  }
  const resposta = await chamarApi("/custos/pagamentos", {
    metodo: "POST",
    corpo: {
      localId: localId.data,
      competencia: texto(form, "competencia"),
      valorCentavos,
      forma: texto(form, "forma"),
      data: texto(form, "data"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_PAGAMENTO);
  refresh();
  return { sucesso: "Pagamento registrado e lançado no Caixa." };
}

/** CUSTO-CA-04 */
export async function estornarPagamentoQuadra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const pagamentoId = id.safeParse(form.get("pagamentoId"));
  if (!pagamentoId.success) return { erro: "Pagamento inválido." };
  const resposta = await chamarApi(`/custos/pagamentos/${pagamentoId.data}/estornar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Pagamento estornado." };
}
