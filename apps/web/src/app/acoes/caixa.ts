"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
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

const VALOR_INVALIDO = "Valor inválido: use o formato 150,00.";
const CAMPOS_ABERTURA = ["troco"] as const;
const CAMPOS_AVULSO = ["categoria", "forma", "valor", "descricao"] as const;
const CAMPOS_FECHAMENTO = ["contado", "observacao"] as const;

/** CAIXA-CA-01 */
export async function abrirCaixa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const digitado = texto(form, "troco");
  const trocoInicialCentavos = digitado ? centavosDe(digitado) : 0;
  if (trocoInicialCentavos === null) {
    return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_ABERTURA);
  }
  const resposta = await chamarApi("/caixa/sessoes", {
    metodo: "POST",
    corpo: { trocoInicialCentavos },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_ABERTURA);
  refresh();
  return { sucesso: "Caixa aberto." };
}

/** CAIXA-CA-02 */
export async function lancarAvulso(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valorCentavos = centavosDe(texto(form, "valor"));
  if (valorCentavos === null) return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_AVULSO);
  const resposta = await chamarApi("/caixa/avulsos", {
    metodo: "POST",
    corpo: {
      categoria: texto(form, "categoria"),
      forma: texto(form, "forma"),
      valorCentavos,
      descricao: texto(form, "descricao"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_AVULSO);
  refresh();
  return { sucesso: "Lançamento registrado." };
}

/** CAIXA-CA-04 */
export async function fecharCaixa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const turnoId = id.safeParse(form.get("turnoId"));
  if (!turnoId.success) return { erro: "Turno inválido." };
  const contadoDinheiroCentavos = centavosDe(texto(form, "contado"));
  if (contadoDinheiroCentavos === null) {
    return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_FECHAMENTO);
  }
  const resposta = await chamarApi(`/caixa/sessoes/${turnoId.data}/fechar`, {
    metodo: "POST",
    corpo: { contadoDinheiroCentavos, observacao: texto(form, "observacao") },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_FECHAMENTO);
  redirect(`/caixa/turnos/${turnoId.data}?fechado=1`);
}

/** CAIXA-CA-06 */
export async function estornarAvulso(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const lancamentoId = id.safeParse(form.get("lancamentoId"));
  if (!lancamentoId.success) return { erro: "Lançamento inválido." };
  const resposta = await chamarApi(`/caixa/avulsos/${lancamentoId.data}/estornar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Lançamento estornado." };
}
