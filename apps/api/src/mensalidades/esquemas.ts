import { z } from "zod";
import { dataValida } from "../aulas/regras.js";
import {
  competenciaValida,
  DIA_VENCIMENTO_MAXIMO,
  FORMAS_PAGAMENTO,
  PLANO_VALOR_MAXIMO,
  PLANO_VALOR_MINIMO,
  SITUACOES,
} from "./regras.js";

const centavos = z.number({ error: "Informe um valor em centavos." }).int("Valor inválido.");

export const competenciaSchema = z.string().refine(competenciaValida, "Mês inválido: use AAAA-MM.");

const motivo = z.string().trim().min(3, "Informe o motivo.").max(200);

export const planoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano.").max(60),
  aulasPorSemana: z
    .number()
    .int()
    .min(1, "Aulas por semana: de 1 a 7.")
    .max(7, "Aulas por semana: de 1 a 7."),
  valorCentavos: centavos
    .min(PLANO_VALOR_MINIMO, "O valor do plano vai de R$ 1,00 a R$ 10.000,00.")
    .max(PLANO_VALOR_MAXIMO, "O valor do plano vai de R$ 1,00 a R$ 10.000,00."),
  ativo: z.boolean().default(true),
});

export const assinaturaSchema = z
  .object({
    planoId: z.uuid("Escolha o plano."),
    diaVencimento: z
      .number()
      .int()
      .min(1, "Dia de vencimento: de 1 a 28.")
      .max(DIA_VENCIMENTO_MAXIMO, "Dia de vencimento: de 1 a 28."),
    descontoCentavos: centavos.min(0, "Desconto inválido.").default(0),
    motivoDesconto: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((v) => (v ? v : null)),
    inicio: competenciaSchema,
  })
  .refine((a) => a.descontoCentavos === 0 || (a.motivoDesconto?.length ?? 0) >= 3, {
    message: "Informe o motivo do desconto.",
    path: ["motivoDesconto"],
  });

export const geracaoSchema = z.object({ competencia: competenciaSchema });

export const consultaMensalidadesSchema = z.object({
  competencia: competenciaSchema,
  situacao: z.enum(SITUACOES).optional(),
  busca: z.string().trim().max(120).optional(),
});

export const pagamentoSchema = z.object({
  forma: z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." }),
  data: z.string().refine(dataValida, "Data inválida."),
});

export const motivoSchema = z.object({ motivo });

export const consultaCaixaSchema = z.object({
  data: z.string().refine(dataValida, "Data inválida.").optional(),
});
