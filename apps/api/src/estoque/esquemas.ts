import { z } from "zod";
import { dataValida } from "../aulas/regras.js";
import { FORMAS_PAGAMENTO } from "../mensalidades/regras.js";
import { COMPRA_MAXIMA, ITENS_POR_VENDA, PRECO_MAXIMO, QUANTIDADE_MAXIMA } from "./regras.js";

const inteiro = (mensagem: string) => z.number({ error: mensagem }).int(mensagem);
const quantidade = inteiro("Quantidade inválida.")
  .min(1, `A quantidade vai de 1 a ${QUANTIDADE_MAXIMA}.`)
  .max(QUANTIDADE_MAXIMA, `A quantidade vai de 1 a ${QUANTIDADE_MAXIMA}.`);
const forma = z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." });

export const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(80),
  precoCentavos: inteiro("Preço inválido.")
    .min(1, "O preço vai de R$ 0,01 a R$ 1.000,00.")
    .max(PRECO_MAXIMO, "O preço vai de R$ 0,01 a R$ 1.000,00."),
  estoqueMinimo: inteiro("Estoque mínimo inválido.")
    .min(0, `O estoque mínimo vai de 0 a ${QUANTIDADE_MAXIMA}.`)
    .max(QUANTIDADE_MAXIMA, `O estoque mínimo vai de 0 a ${QUANTIDADE_MAXIMA}.`)
    .default(0),
  ativo: z.boolean().default(true),
});

export const compraSchema = z.object({
  produtoId: z.uuid("Escolha o produto."),
  quantidade,
  totalCentavos: inteiro("Valor inválido.")
    .min(1, "Informe o valor pago.")
    .max(COMPRA_MAXIMA, "O valor pago vai até R$ 100.000,00."),
  forma,
  data: z.string().refine(dataValida, "Data inválida."),
});

export const vendaSchema = z.object({
  itens: z
    .array(z.object({ produtoId: z.uuid("Produto inválido."), quantidade }))
    .min(1, "Escolha ao menos um produto.")
    .max(ITENS_POR_VENDA, `Uma venda tem até ${ITENS_POR_VENDA} itens.`),
  forma,
});

export const ajusteSchema = z.object({
  produtoId: z.uuid("Escolha o produto."),
  quantidade: inteiro("Quantidade inválida.")
    .min(-QUANTIDADE_MAXIMA, "Quantidade fora da faixa.")
    .max(QUANTIDADE_MAXIMA, "Quantidade fora da faixa.")
    .refine((q) => q !== 0, "O ajuste não pode ser zero."),
  motivo: z.string().trim().min(3, "Informe o motivo.").max(200),
});

export const consultaVendasSchema = z.object({
  data: z.string().refine(dataValida, "Data inválida.").optional(),
});
