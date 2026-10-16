import { z } from "zod";
import { LEGENDA_MAXIMA, NUMERO_VALIDO, TEXTO_MAXIMO } from "./regras.js";

export const numeroSchema = z.string().regex(NUMERO_VALIDO, "Número inválido.");

/** Identificador de mensagem do WhatsApp. */
const mensagemId = z.string().regex(/^[A-Za-z0-9_-]{4,64}$/, "Mensagem inválida.");

export const consultaMensagensSchema = z.object({
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
});

export const consultaMidiaSchema = z.object({ numero: numeroSchema });

const arquivo = z.object({
  base64: z.string().min(1, "Escolha um arquivo."),
  mimetype: z.string().min(3).max(120),
  nome: z.string().trim().min(1).max(200),
});

const citadaId = mensagemId.optional();
const legenda = z
  .string()
  .trim()
  .max(LEGENDA_MAXIMA, "A legenda pode ter até 1.024 caracteres.")
  .optional();

/** CHAT-CA-06: o que pode ser enviado numa conversa. O arquivo é conferido no serviço. */
export const envioSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("texto"),
    texto: z
      .string()
      .trim()
      .min(1, "Escreva a mensagem.")
      .max(TEXTO_MAXIMO, "A mensagem pode ter até 4.000 caracteres."),
    citadaId,
  }),
  z.object({ tipo: z.literal("imagem"), arquivo, legenda, citadaId }),
  z.object({ tipo: z.literal("video"), arquivo, legenda, citadaId }),
  z.object({ tipo: z.literal("documento"), arquivo, legenda, citadaId }),
  z.object({ tipo: z.literal("audio"), arquivo, citadaId }),
  z
    .object({
      tipo: z.literal("figurinha"),
      arquivo: arquivo.optional(),
      /** Reenviar uma figurinha recebida. */
      deMensagemId: mensagemId.optional(),
      citadaId,
    })
    .refine((f) => Boolean(f.arquivo) !== Boolean(f.deMensagemId), {
      message: "Escolha uma imagem ou uma figurinha recebida.",
      path: ["arquivo"],
    }),
]);
export type Envio = z.infer<typeof envioSchema>;

export const reacaoSchema = z.object({
  mensagemId,
  deMim: z.boolean(),
  /** Vazio tira a reação. */
  emoji: z.string().max(16),
});
