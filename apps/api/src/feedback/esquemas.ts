import { z } from "zod";
import { NOME_MAXIMO, NOTA_MAXIMA, NOTA_MINIMA, TEXTO_MAXIMO } from "./regras.js";

const textoLivre = (maximo: number, mensagem: string) => z.string().max(maximo, mensagem).nullish();

/** FEED-CA-01: a resposta do formulário público. */
export const respostaSchema = z.object({
  nota: z
    .number({ error: "Escolha uma nota de 1 a 5." })
    .int("Escolha uma nota de 1 a 5.")
    .min(NOTA_MINIMA, "Escolha uma nota de 1 a 5.")
    .max(NOTA_MAXIMA, "Escolha uma nota de 1 a 5."),
  comentario: textoLivre(TEXTO_MAXIMO, "Escreva até 1.000 caracteres."),
  melhoria: textoLivre(TEXTO_MAXIMO, "Escreva até 1.000 caracteres."),
  turmaId: z.uuid("Escolha uma turma da lista.").nullish(),
  nome: textoLivre(NOME_MAXIMO, "O nome pode ter até 120 caracteres."),
  /** FEED-CA-03: campo armadilha; pessoas não veem nem preenchem. */
  site: z.string().max(500).nullish(),
});

const data = z.string().max(10);

/** FEED-CA-05: período (de e até), turma e nota. A faixa do período é conferida no serviço. */
export const consultaPainelSchema = z.object({
  de: data.optional(),
  ate: data.optional(),
  turmaId: z.uuid("Turma inválida.").optional(),
  nota: z.coerce.number().int().min(NOTA_MINIMA).max(NOTA_MAXIMA).optional(),
});

export const formularioSchema = z.object({ pausado: z.boolean() });
