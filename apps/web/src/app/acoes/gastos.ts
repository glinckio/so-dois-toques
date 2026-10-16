"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { minutosDe } from "@/lib/aulas/formatacao";
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

const CAMPOS_GASTO = [
  "tipo",
  "quadraId",
  "descricao",
  "observacao",
  "data",
  "valor",
  "forma",
] as const;

/** GASTO-CA-05: locação avulsa de quadra ou outro gasto (equipamento, investimento, outro). */
export async function lancarGasto(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const valorCentavos = centavosDe(texto(form, "valor"));
  if (valorCentavos === null) return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_GASTO);
  const tipo = texto(form, "tipo");
  const comum = { data: texto(form, "data"), valorCentavos, forma: texto(form, "forma") };
  const resposta =
    tipo === "LOCACAO_AVULSA"
      ? await chamarApi("/gastos/locacoes", {
          metodo: "POST",
          corpo: {
            ...comum,
            quadraId: texto(form, "quadraId"),
            observacao: texto(form, "observacao") || null,
          },
        })
      : await chamarApi("/gastos", {
          metodo: "POST",
          corpo: { ...comum, categoria: tipo, descricao: texto(form, "descricao") },
        });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_GASTO);
  refresh();
  return { sucesso: "Gasto lançado. O saldo em caixa já foi atualizado." };
}

/** GASTO-CA-06 */
export async function estornarGasto(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const lancamentoId = id.safeParse(form.get("lancamentoId"));
  if (!lancamentoId.success) return { erro: "Lançamento inválido." };
  const resposta = await chamarApi(`/gastos/${lancamentoId.data}/estorno`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Estorno lançado: o valor voltou para o caixa." };
}

const CAMPOS_CONTRATO = [
  "quadraId",
  "diaSemana",
  "horaInicio",
  "horaFim",
  "valor",
  "diaPagamento",
  "forma",
  "inicio",
] as const;

/** GASTO-CA-03 e 04 */
export async function registrarContrato(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const valorCentavos = centavosDe(texto(form, "valor"));
  if (valorCentavos === null) {
    return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_CONTRATO);
  }
  const horaInicio = minutosDe(texto(form, "horaInicio"));
  const horaFim = minutosDe(texto(form, "horaFim"));
  if (horaInicio === null || horaFim === null) {
    return erroComValores({ erro: "Informe o início e o fim do horário." }, form, CAMPOS_CONTRATO);
  }
  const resposta = await chamarApi<{ id: string; lancados: number }>("/gastos/contratos", {
    metodo: "POST",
    corpo: {
      quadraId: texto(form, "quadraId"),
      diaSemana: Number(texto(form, "diaSemana")),
      horaInicio,
      horaFim,
      valorCentavos,
      diaPagamento: Number(texto(form, "diaPagamento")),
      forma: texto(form, "forma"),
      inicio: texto(form, "inicio"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_CONTRATO);
  refresh();
  const { lancados } = resposta.dados;
  return {
    sucesso:
      lancados > 0
        ? "Contrato registrado. O aluguel deste mês já saiu do caixa."
        : "Contrato registrado. O aluguel sai do caixa sozinho no dia do pagamento.",
  };
}

/** GASTO-CA-04: daquele mês em diante, não lança mais. */
export async function encerrarContrato(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const contratoId = id.safeParse(form.get("contratoId"));
  if (!contratoId.success) return { erro: "Contrato inválido." };
  const resposta = await chamarApi(`/gastos/contratos/${contratoId.data}/encerrar`, {
    metodo: "POST",
    corpo: { fim: texto(form, "fim") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Contrato encerrado." };
}
