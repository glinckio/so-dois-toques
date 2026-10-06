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

/** Valor digitado em reais ("150,00") para centavos; mensagem clara se não for valor. */
function valorEmCentavos(form: FormData, campo: string, vazioVale = false): number | string {
  const digitado = texto(form, campo);
  if (!digitado && vazioVale) return 0;
  const centavos = centavosDe(digitado);
  return centavos ?? "Valor inválido: use o formato 150,00.";
}

const CAMPOS_PLANO = ["nome", "aulasPorSemana", "valor", "ativo"] as const;
const CAMPOS_ASSINATURA = [
  "planoId",
  "inicio",
  "diaVencimento",
  "desconto",
  "motivoDesconto",
] as const;

// ---------- Planos (MENS-CA-01) ----------

export async function salvarPlano(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const planoId = texto(form, "id");
  if (planoId && !id.safeParse(planoId).success) return { erro: "Plano inválido." };
  const valorCentavos = valorEmCentavos(form, "valor");
  if (typeof valorCentavos === "string") {
    return erroComValores({ erro: valorCentavos }, form, CAMPOS_PLANO);
  }
  const corpo = {
    nome: texto(form, "nome"),
    aulasPorSemana: Number(texto(form, "aulasPorSemana")),
    valorCentavos,
    ativo: texto(form, "ativo") !== "false",
  };
  const resposta = planoId
    ? await chamarApi(`/planos/${planoId}`, { metodo: "PATCH", corpo })
    : await chamarApi("/planos", { metodo: "POST", corpo });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_PLANO);
  refresh();
  return { sucesso: planoId ? `Plano ${corpo.nome} salvo.` : `Plano ${corpo.nome} cadastrado.` };
}

// ---------- Plano do aluno (MENS-CA-02 a 04) ----------

export async function definirAssinatura(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const alunoId = id.safeParse(form.get("alunoId"));
  if (!alunoId.success) return { erro: "Aluno inválido." };
  const descontoCentavos = valorEmCentavos(form, "desconto", true);
  if (typeof descontoCentavos === "string") {
    return erroComValores({ erro: descontoCentavos }, form, CAMPOS_ASSINATURA);
  }
  const resposta = await chamarApi(`/alunos/${alunoId.data}/assinatura`, {
    metodo: "PUT",
    corpo: {
      planoId: texto(form, "planoId"),
      diaVencimento: Number(texto(form, "diaVencimento")),
      descontoCentavos,
      motivoDesconto: texto(form, "motivoDesconto"),
      inicio: texto(form, "inicio"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_ASSINATURA);
  refresh();
  return { sucesso: "Plano do aluno salvo." };
}

export async function encerrarAssinatura(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const alunoId = id.safeParse(form.get("alunoId"));
  if (!alunoId.success) return { erro: "Aluno inválido." };
  const resposta = await chamarApi(`/alunos/${alunoId.data}/assinatura`, { metodo: "DELETE" });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

// ---------- Mensalidades (MENS-CA-05 a 13) ----------

export async function gerarMensalidades(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const resposta = await chamarApi<{ criadas: number }>("/mensalidades/geracoes", {
    metodo: "POST",
    corpo: { competencia: texto(form, "competencia") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  const { criadas } = resposta.dados;
  return {
    sucesso:
      criadas === 0
        ? "Nenhuma mensalidade nova: todas já estavam geradas."
        : `${criadas} ${criadas === 1 ? "mensalidade gerada" : "mensalidades geradas"}.`,
  };
}

export async function registrarPagamento(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const mensalidadeId = id.safeParse(form.get("mensalidadeId"));
  if (!mensalidadeId.success) return { erro: "Mensalidade inválida." };
  const resposta = await chamarApi<{ id: string }>(
    `/mensalidades/${mensalidadeId.data}/pagamentos`,
    { metodo: "POST", corpo: { forma: texto(form, "forma"), data: texto(form, "data") } },
  );
  if (!resposta.ok) return erroDe(resposta);
  redirect(`/caixa/recibos/${resposta.dados.id}?novo=1`);
}

export async function cancelarMensalidade(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const mensalidadeId = id.safeParse(form.get("mensalidadeId"));
  if (!mensalidadeId.success) return { erro: "Mensalidade inválida." };
  const resposta = await chamarApi(`/mensalidades/${mensalidadeId.data}/cancelar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Mensalidade cancelada." };
}

export async function estornarPagamento(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const pagamentoId = id.safeParse(form.get("pagamentoId"));
  if (!pagamentoId.success) return { erro: "Pagamento inválido." };
  const resposta = await chamarApi(`/pagamentos/${pagamentoId.data}/estornar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Pagamento estornado." };
}
