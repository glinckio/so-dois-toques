import { z } from "zod";
import { dataValida, HORARIO_MAXIMO, HORARIO_MINIMO } from "../aulas/regras.js";
import { competenciaSchema } from "../mensalidades/esquemas.js";
import { FORMAS_PAGAMENTO } from "../mensalidades/regras.js";
import {
  CATEGORIAS_GASTO,
  CONTRATO_VALOR_MAXIMO,
  CONTRATO_VALOR_MINIMO,
  DIA_PAGAMENTO_MAXIMO,
  GASTO_VALOR_MAXIMO,
  GASTO_VALOR_MINIMO,
  TIPOS_DE_ENTRADA,
} from "./regras.js";

const centavos = z.number({ error: "Informe um valor em centavos." }).int("Valor inválido.");
const forma = z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." });
const data = z.string().refine(dataValida, "Data inválida.");
const quadraId = z.uuid("Escolha a quadra.");

const valorDoGasto = centavos
  .min(GASTO_VALOR_MINIMO, "O valor vai de R$ 0,01 a R$ 100.000,00.")
  .max(GASTO_VALOR_MAXIMO, "O valor vai de R$ 0,01 a R$ 100.000,00.");

/** GASTO-CA-03 */
export const contratoSchema = z
  .object({
    quadraId,
    diaSemana: z
      .number()
      .int()
      .min(0, "Escolha o dia da semana.")
      .max(6, "Escolha o dia da semana."),
    horaInicio: z.number().int().min(HORARIO_MINIMO, "O horário começa a partir das 05:00."),
    horaFim: z.number().int().max(HORARIO_MAXIMO, "O horário termina até as 23:59."),
    valorCentavos: centavos
      .min(CONTRATO_VALOR_MINIMO, "O valor por mês vai de R$ 1,00 a R$ 20.000,00.")
      .max(CONTRATO_VALOR_MAXIMO, "O valor por mês vai de R$ 1,00 a R$ 20.000,00."),
    diaPagamento: z
      .number()
      .int()
      .min(1, "Dia do pagamento: de 1 a 28.")
      .max(DIA_PAGAMENTO_MAXIMO, "Dia do pagamento: de 1 a 28."),
    forma,
    inicio: competenciaSchema,
  })
  .refine((c) => c.horaFim > c.horaInicio, {
    message: "O fim do horário precisa ser depois do início.",
    path: ["horaFim"],
  });

export const encerrarContratoSchema = z.object({ fim: competenciaSchema });

/** GASTO-CA-05 */
export const locacaoSchema = z.object({
  quadraId,
  data,
  valorCentavos: valorDoGasto,
  forma,
  observacao: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export const gastoSchema = z.object({
  categoria: z.enum(CATEGORIAS_GASTO, { error: "Escolha o tipo do gasto." }),
  descricao: z.string().trim().min(3, "Descreva o gasto.").max(200),
  data,
  valorCentavos: valorDoGasto,
  forma,
});

/** ENTRADA-CA-01: mesmas faixas do gasto. */
export const entradaSchema = z.object({
  categoria: z.enum(TIPOS_DE_ENTRADA, { error: "Escolha o tipo da entrada." }),
  descricao: z.string().trim().min(3, "Descreva a entrada.").max(200),
  data,
  valorCentavos: valorDoGasto,
  forma,
});

/** GASTO-CA-06 */
export const estornoSchema = z.object({
  motivo: z.string().trim().min(3, "Informe o motivo.").max(180),
});

/** GASTO-CA-07 */
export const saldoInicialSchema = z.object({ data, valorCentavos: valorDoGasto });

export const consultaGastosSchema = z.object({ competencia: competenciaSchema.optional() });
