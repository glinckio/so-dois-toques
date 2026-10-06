import { z } from "zod";
import { FORMAS_PAGAMENTO } from "../mensalidades/regras.js";
import { AVULSO_MAXIMO, NOMES_CATEGORIAS_AVULSAS, TROCO_MAXIMO } from "./regras.js";

const centavos = z.number({ error: "Informe um valor em centavos." }).int("Valor inválido.");

export const aberturaSchema = z.object({
  trocoInicialCentavos: centavos
    .min(0, "O troco vai de R$ 0,00 a R$ 10.000,00.")
    .max(TROCO_MAXIMO, "O troco vai de R$ 0,00 a R$ 10.000,00."),
});

export const fechamentoSchema = z.object({
  contadoDinheiroCentavos: centavos
    .min(0, "Informe o dinheiro contado na gaveta.")
    .max(AVULSO_MAXIMO, "Valor contado alto demais."),
  observacao: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export const avulsoSchema = z.object({
  categoria: z.enum(NOMES_CATEGORIAS_AVULSAS, { error: "Escolha o tipo do lançamento." }),
  forma: z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." }),
  valorCentavos: centavos
    .min(1, "Informe o valor.")
    .max(AVULSO_MAXIMO, "O valor vai até R$ 100.000,00."),
  descricao: z.string().trim().min(3, "Descreva o lançamento.").max(120),
});
