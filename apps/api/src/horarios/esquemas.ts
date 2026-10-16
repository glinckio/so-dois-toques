import { z } from "zod";
import { dataValida } from "../aulas/regras.js";
import { HORA_ABRE, HORA_FECHA } from "./regras.js";

const inteiro = (mensagem: string) => z.number({ error: mensagem }).int(mensagem);
const data = z.string().refine(dataValida, "Data inválida.");
const FORA = `A quadra abre das ${HORA_ABRE}h às ${HORA_FECHA}h.`;
const horaInicio = inteiro("Hora inválida.")
  .min(HORA_ABRE, FORA)
  .max(HORA_FECHA - 1, FORA);
const horaFim = inteiro("Hora inválida.")
  .min(HORA_ABRE + 1, FORA)
  .max(HORA_FECHA, FORA);
const motivo = z.string().trim().min(3, "Informe o motivo do bloqueio.").max(200);

const nomeDaQuadra = z.string().trim().min(2, "Informe o nome da quadra.").max(40);

/** GASTO-CA-01: quadra nova e alteração (nome e se está ativa). */
export const quadraSchema = z.object({ nome: nomeDaQuadra });
export const alterarQuadraSchema = z.object({ nome: nomeDaQuadra, ativa: z.boolean() });

const quadraId = z.uuid("Escolha a quadra.");

/** FOCO-CA-06: bloqueio avulso (data) ou semanal (dataInicio e dataFim). */
export const bloqueioSchema = z
  .discriminatedUnion("repeticao", [
    z.object({ repeticao: z.literal("AVULSO"), quadraId, data, horaInicio, horaFim, motivo }),
    z.object({
      repeticao: z.literal("SEMANAL"),
      quadraId,
      dataInicio: data,
      dataFim: data,
      horaInicio,
      horaFim,
      motivo,
    }),
  ])
  .refine((b) => b.horaFim > b.horaInicio, {
    message: "A hora de fim precisa ser depois do início.",
    path: ["horaFim"],
  });

export const consultaGradeSchema = z.object({ data: data.optional(), quadra: quadraId.optional() });
