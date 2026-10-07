import { z } from "zod";
import { telefoneOpcional } from "../aulas/esquemas.js";
import { dataValida } from "../aulas/regras.js";
import { FORMAS_PAGAMENTO } from "../mensalidades/regras.js";
import { DURACAO_MAXIMA, VALOR_HORA_MAXIMO, VALOR_HORA_MINIMO } from "./regras.js";

const inteiro = (mensagem: string) => z.number({ error: mensagem }).int(mensagem);
const data = z.string().refine(dataValida, "Data inválida.");
const horaInicio = inteiro("Hora inválida.").min(0, "Hora inválida.").max(23, "Hora inválida.");
const horaFim = inteiro("Hora inválida.").min(1, "Hora inválida.").max(24, "Hora inválida.");
const diaSemana = inteiro("Dia da semana inválido.").min(0).max(6);
const duracao = inteiro("Duração inválida.")
  .min(1, `A duração vai de 1 a ${DURACAO_MAXIMA} horas.`)
  .max(DURACAO_MAXIMA, `A duração vai de 1 a ${DURACAO_MAXIMA} horas.`);
const clienteNome = z.string().trim().min(2, "Informe o nome do cliente.").max(80);
const motivoBloqueio = z.string().trim().min(3, "Informe o motivo do bloqueio.").max(200);

export const faixasSchema = z
  .object({
    dias: z
      .array(diaSemana)
      .min(1, "Escolha ao menos um dia da semana.")
      .max(7)
      .refine((d) => new Set(d).size === d.length, "Dia repetido."),
    horaInicio,
    horaFim,
    valorHoraCentavos: inteiro("Valor inválido.")
      .min(VALOR_HORA_MINIMO, "O valor da hora vai de R$ 1,00 a R$ 2.000,00.")
      .max(VALOR_HORA_MAXIMO, "O valor da hora vai de R$ 1,00 a R$ 2.000,00."),
  })
  .refine((f) => f.horaFim > f.horaInicio, {
    message: "A hora de fim precisa ser depois do início.",
    path: ["horaFim"],
  });

export const quadraSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da quadra.").max(40),
});

const ocupacao = {
  quadraId: z.uuid("Escolha a quadra."),
  horaInicio,
  duracao,
};

/** Reserva de cliente ou bloqueio; avulsa (data) ou semanal (dataInicio e dataFim). */
export const reservaSchema = z
  .discriminatedUnion("tipo", [
    z.object({
      tipo: z.literal("RESERVA"),
      clienteNome,
      clienteTelefone: telefoneOpcional,
    }),
    z.object({ tipo: z.literal("BLOQUEIO"), motivo: motivoBloqueio }),
  ])
  .and(
    z.discriminatedUnion("repeticao", [
      z.object({ repeticao: z.literal("AVULSA"), ...ocupacao, data }),
      z.object({
        repeticao: z.literal("SEMANAL"),
        ...ocupacao,
        dataInicio: data,
        dataFim: data,
      }),
    ]),
  )
  .refine((r) => r.horaInicio + r.duracao <= 24, {
    message: "A reserva precisa terminar até meia-noite.",
    path: ["duracao"],
  });

export const pagamentoReservaSchema = z.object({
  forma: z.enum(FORMAS_PAGAMENTO, { error: "Escolha a forma de pagamento." }),
});

export const consultaGradeSchema = z.object({ data: data.optional() });

export const anonimizarClientesSchema = z.object({
  confirmar: z.literal(true, "Confirme a anonimização."),
});
