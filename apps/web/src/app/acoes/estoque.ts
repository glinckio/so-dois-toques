"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { CAMPO_QUANTIDADE, itensDoFormulario } from "@/lib/estoque/formatacao";
import { centavosDe, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";
import { erroComValores } from "./formulario";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const VALOR_INVALIDO = "Valor inválido: use o formato 150,00.";

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const CAMPOS_PRODUTO = ["nome", "preco", "estoqueMinimo", "ativo"] as const;
const CAMPOS_COMPRA = ["produtoId", "quantidade", "total", "forma", "data"] as const;
const CAMPOS_AJUSTE = ["quantidade", "motivo"] as const;

/** ESTQ-CA-01 */
export async function salvarProduto(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const produtoId = texto(form, "id");
  if (produtoId && !id.safeParse(produtoId).success) return { erro: "Produto inválido." };
  const precoCentavos = centavosDe(texto(form, "preco"));
  if (precoCentavos === null) return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_PRODUTO);
  const corpo = {
    nome: texto(form, "nome"),
    precoCentavos,
    estoqueMinimo: Number(texto(form, "estoqueMinimo") || "0"),
    ativo: texto(form, "ativo") !== "false",
  };
  const resposta = produtoId
    ? await chamarApi(`/produtos/${produtoId}`, { metodo: "PATCH", corpo })
    : await chamarApi("/produtos", { metodo: "POST", corpo });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_PRODUTO);
  refresh();
  return {
    sucesso: produtoId ? `Produto ${corpo.nome} salvo.` : `Produto ${corpo.nome} cadastrado.`,
  };
}

/** ESTQ-CA-02 */
export async function registrarCompra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const totalCentavos = centavosDe(texto(form, "total"));
  if (totalCentavos === null) return erroComValores({ erro: VALOR_INVALIDO }, form, CAMPOS_COMPRA);
  const resposta = await chamarApi("/estoque/compras", {
    metodo: "POST",
    corpo: {
      produtoId: texto(form, "produtoId"),
      quantidade: Number(texto(form, "quantidade")),
      totalCentavos,
      forma: texto(form, "forma"),
      data: texto(form, "data"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_COMPRA);
  refresh();
  return { sucesso: "Compra registrada e lançada no Caixa." };
}

/** ESTQ-CA-03 */
export async function registrarVenda(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const campos = [...form.keys()].filter((nome) => CAMPO_QUANTIDADE.test(nome));
  const camposVenda = [...campos, "forma"];
  const itens = itensDoFormulario(form.entries());
  if (itens === null) {
    return erroComValores({ erro: "Use quantidades inteiras." }, form, camposVenda);
  }
  if (itens.length === 0) {
    return erroComValores({ erro: "Escolha ao menos um produto." }, form, camposVenda);
  }
  const resposta = await chamarApi<{ totalCentavos: number }>("/estoque/vendas", {
    metodo: "POST",
    corpo: { itens, forma: texto(form, "forma") },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, camposVenda);
  refresh();
  return { sucesso: `Venda de ${formatarReais(resposta.dados.totalCentavos)} registrada.` };
}

/** ESTQ-CA-05 */
export async function ajustarEstoque(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const produtoId = id.safeParse(form.get("produtoId"));
  if (!produtoId.success) return { erro: "Produto inválido." };
  const digitado = texto(form, "quantidade");
  if (!/^-?\d+$/.test(digitado)) {
    return erroComValores(
      { erro: "Use um número inteiro: positivo entra, negativo sai." },
      form,
      CAMPOS_AJUSTE,
    );
  }
  const resposta = await chamarApi("/estoque/ajustes", {
    metodo: "POST",
    corpo: {
      produtoId: produtoId.data,
      quantidade: Number(digitado),
      motivo: texto(form, "motivo"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_AJUSTE);
  refresh();
  return { sucesso: "Estoque ajustado." };
}

/** ESTQ-CA-06 */
export async function estornarVenda(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const vendaId = id.safeParse(form.get("vendaId"));
  if (!vendaId.success) return { erro: "Venda inválida." };
  const resposta = await chamarApi(`/estoque/vendas/${vendaId.data}/estornar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Venda estornada." };
}

export async function estornarCompra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const compraId = id.safeParse(form.get("compraId"));
  if (!compraId.success) return { erro: "Compra inválida." };
  const resposta = await chamarApi(`/estoque/compras/${compraId.data}/estornar`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Compra estornada." };
}
