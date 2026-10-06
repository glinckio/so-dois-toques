import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";

export const FORMAS = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
} as const;
export type Forma = keyof typeof FORMAS;

export const SITUACOES = {
  EM_ABERTO: "Em aberto",
  ATRASADA: "Atrasada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
} as const;
export type Situacao = keyof typeof SITUACOES;

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos inteiros em reais ("R$ 1.234,56"). */
export function formatarReais(centavos: number): string {
  return REAIS.format(centavos / 100).replace(/ /g, " ");
}

/**
 * Converte o que a pessoa digitou ("150", "150,5", "1.234,56", "R$ 99,90") em centavos
 * inteiros, sem passar por número com vírgula flutuante. Devolve null se não for valor.
 */
export function centavosDe(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  const partes = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(limpo);
  if (!partes) return null;
  const inteiros = Number(partes[1]!.replace(/\./g, ""));
  const centavos = Number((partes[2] ?? "").padEnd(2, "0"));
  const total = inteiros * 100 + centavos;
  return Number.isSafeInteger(total) ? total : null;
}

/** Centavos para o campo de valor ("150,00"). */
export function valorParaCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function competenciaValida(competencia: string | undefined): competencia is string {
  const partes = /^(\d{4})-(\d{2})$/.exec(competencia ?? "");
  if (!partes) return false;
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12;
}

/** "2026-10" vira "outubro de 2026". */
export function nomeDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  return `${MESES[mes - 1]} de ${ano}`;
}

export function competenciaAtual(agora = new Date()): string {
  return hojeEmSaoPaulo(agora).slice(0, 7);
}

/** Mês deslocado: deslocarMes("2026-01", -1) é "2025-12". */
export function deslocarMes(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return d.toISOString().slice(0, 7);
}
