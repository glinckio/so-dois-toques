import { z } from "zod";
import { competenciaSchema } from "../mensalidades/esquemas.js";

const data = z.string().max(10);

/** CONT-CA-03: um mês, ou um intervalo (de e até). A faixa é conferida no serviço. */
export const consultaContabilSchema = z
  .object({
    competencia: competenciaSchema.optional(),
    de: data.optional(),
    ate: data.optional(),
  })
  .refine((c) => (c.de === undefined) === (c.ate === undefined), {
    message: "Informe o início e o fim do período.",
    path: ["ate"],
  })
  .refine((c) => !(c.competencia && c.de), {
    message: "Escolha um mês ou um intervalo, não os dois.",
    path: ["competencia"],
  });

export type ConsultaContabil = z.infer<typeof consultaContabilSchema>;
