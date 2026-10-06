/** Regras puras de mensalidades e do Caixa (Etapa 3). Sem acesso a banco. */

import { hojeEmSaoPaulo } from "../aulas/regras.js";

export const FORMAS_PAGAMENTO = ["PIX", "DINHEIRO", "CARTAO_DEBITO", "CARTAO_CREDITO"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const PLANO_VALOR_MINIMO = 100;
export const PLANO_VALOR_MAXIMO = 1_000_000;
export const DIA_VENCIMENTO_MAXIMO = 28;

const COMPETENCIA = /^(\d{4})-(\d{2})$/;

/** "AAAA-MM" de um mês que existe (anos de 2000 a 2100). */
export function competenciaValida(competencia: string): boolean {
  const partes = COMPETENCIA.exec(competencia);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  return ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12;
}

/** Mês ("AAAA-MM") de uma data "AAAA-MM-DD". */
export function competenciaDe(data: string): string {
  return data.slice(0, 7);
}

/** MENS-CA-07: mês corrente no calendário de São Paulo. */
export function competenciaAtual(agora: Date): string {
  return competenciaDe(hojeEmSaoPaulo(agora));
}

/** Primeiro dia do mês, "AAAA-MM-01", como fica no banco. */
export function primeiroDia(competencia: string): string {
  return `${competencia}-01`;
}

export function proximaCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

/** Vencimento "AAAA-MM-DD" no dia escolhido (1 a 28, existe em todo mês). */
export function vencimentoEm(competencia: string, dia: number): string {
  return `${competencia}-${String(dia).padStart(2, "0")}`;
}

/** Valor da mensalidade: plano menos desconto. Desconto precisa ser menor que o plano. */
export function valorDaMensalidade(valorPlano: number, desconto: number): number | null {
  if (!Number.isInteger(valorPlano) || !Number.isInteger(desconto)) return null;
  if (desconto < 0 || desconto >= valorPlano) return null;
  return valorPlano - desconto;
}

/** A assinatura cobra a competência quando começou nela ou antes e ainda não terminou. */
export function assinaturaValeEm(
  assinatura: { inicio: string; fim: string | null },
  competencia: string,
): boolean {
  const mes = primeiroDia(competencia);
  return assinatura.inicio <= mes && (assinatura.fim === null || assinatura.fim > mes);
}

export type SituacaoGuardada = "ABERTA" | "PAGA" | "CANCELADA";
export const SITUACOES = ["EM_ABERTO", "ATRASADA", "PAGA", "CANCELADA"] as const;
export type Situacao = (typeof SITUACOES)[number];

/** MENS-CA-08: em aberto até o vencimento; atrasada a partir do dia seguinte. */
export function situacaoEm(
  mensalidade: { situacao: SituacaoGuardada; vencimento: string },
  hoje: string,
): Situacao {
  if (mensalidade.situacao === "PAGA") return "PAGA";
  if (mensalidade.situacao === "CANCELADA") return "CANCELADA";
  return hoje > mensalidade.vencimento ? "ATRASADA" : "EM_ABERTO";
}

/** Dias corridos depois do vencimento (0 se ainda não venceu). */
export function diasDeAtraso(vencimento: string, hoje: string): number {
  const dias =
    (Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${vencimento}T00:00:00Z`)) / 86_400_000;
  return Math.max(0, Math.round(dias));
}

export type LancamentoResumo = {
  tipo: "ENTRADA" | "SAIDA";
  forma: FormaPagamento;
  valorCentavos: number;
};

export type ResumoCaixa = {
  entradas: number;
  saidas: number;
  saldo: number;
  porForma: Record<FormaPagamento, { entradas: number; saidas: number; saldo: number }>;
};

/** MENS-CA-17: totais de entradas, saídas e saldo, no geral e por forma de pagamento. */
export function resumoDoCaixa(lancamentos: readonly LancamentoResumo[]): ResumoCaixa {
  const porForma = Object.fromEntries(
    FORMAS_PAGAMENTO.map((f) => [f, { entradas: 0, saidas: 0, saldo: 0 }]),
  ) as ResumoCaixa["porForma"];
  let entradas = 0;
  let saidas = 0;
  for (const l of lancamentos) {
    const linha = porForma[l.forma];
    if (l.tipo === "ENTRADA") {
      entradas += l.valorCentavos;
      linha.entradas += l.valorCentavos;
    } else {
      saidas += l.valorCentavos;
      linha.saidas += l.valorCentavos;
    }
    linha.saldo = linha.entradas - linha.saidas;
  }
  return { entradas, saidas, saldo: entradas - saidas, porForma };
}

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos inteiros em reais ("R$ 1.234,56"). */
export function formatarReais(centavos: number): string {
  return REAIS.format(centavos / 100).replace(/ /g, " ");
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

/** "2026-10" vira "outubro de 2026". */
export function nomeDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  return `${MESES[mes - 1]} de ${ano}`;
}
