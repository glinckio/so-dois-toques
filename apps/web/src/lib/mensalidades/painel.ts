import type { Situacao } from "./formatacao";

/** Tom do selo de cada situação (o texto vai junto: cor nunca sozinha). */
export const TOM_DA_SITUACAO: Record<Situacao, "ouro" | "perigo" | "sucesso" | "neutro"> = {
  EM_ABERTO: "ouro",
  ATRASADA: "perigo",
  PAGA: "sucesso",
  CANCELADA: "neutro",
};

/** MENS-CA-15: quanto do previsto no mês já foi recebido, de 0 a 1. */
export function fracaoRecebida(totais: { previsto: number; recebido: number }): number {
  if (totais.previsto <= 0) return 0;
  return Math.min(1, Math.max(0, totais.recebido / totais.previsto));
}

/** Dias que enchem a barra de atraso; a marca fica em 30 dias (um mês). */
export const DIAS_DA_BARRA = 90;
export const DIAS_DE_ALERTA = 30;

/** MENS-CA-14: tamanho e tom da barra de atraso de um aluno. */
export function nivelDoAtraso(diasDeAtraso: number): {
  fracao: number;
  tom: "ouro" | "perigo";
  rotulo: string;
} {
  const dias = Math.max(0, Math.floor(diasDeAtraso));
  return {
    fracao: Math.min(1, dias / DIAS_DA_BARRA),
    tom: dias >= DIAS_DE_ALERTA ? "perigo" : "ouro",
    rotulo: `${dias} ${dias === 1 ? "dia" : "dias"} de atraso`,
  };
}

/**
 * Atalho de WhatsApp para o telefone do aluno (DDD + número, só dígitos), com o
 * código do Brasil. Sem telefone válido, não há atalho.
 */
export function linkDoWhatsapp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  return `https://wa.me/55${digitos}`;
}
