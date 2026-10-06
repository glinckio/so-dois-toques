import { z } from "zod";
import { dataValida } from "../aulas/regras.js";
import { competenciaSchema } from "../mensalidades/esquemas.js";
import { FORMAS_PAGAMENTO } from "../mensalidades/regras.js";
import { VALOR_HORA_MAXIMO, VALOR_HORA_MINIMO } from "./regras.js";

const centavos = z.number({ error: "Informe um valor em centavos." }).int("Valor inválido.");

/** R$ 100.000,00: teto de segurança para um pagamento à quadra. */
export const PAGAMENTO_QUADRA_MAXIMO = 10_000_000;

export const valorHoraSchema = z.object({
  valorHoraCentavos: centavos
    .min(VALOR_HORA_MINIMO, "O valor da hora vai de R$ 1,00 a R$ 2.000,00.")
    .max(VALOR_HORA_MAXIMO, "O valor da hora vai de R$ 1,00 a R$ 2.000,00.")
    .nullable(),
});

export const consultaCustosSchema = z.object({ competencia: competenciaSchema });

export const pagamentoQuadraSchema = z.object({
  localId: z.uuid("Escolha o local."),
  competencia: competenciaSchema,
  valorCentavos: centavos
    .min(1, "Informe o valor pago.")
    .max(PAGAMENTO_QUADRA_MAXIMO, "O valor pago vai até R$ 100.000,00."),
  forma: z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." }),
  data: z.string().refine(dataValida, "Data inválida."),
});
