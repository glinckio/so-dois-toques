/** Regras puras de quadras alugadas, gastos e saldo do caixa (Etapa 17). Sem acesso a banco. */

import { DIAS_DA_SEMANA, horaDe } from "../aulas/regras.js";
import {
  competenciaDe,
  nomeDoMes,
  proximaCompetencia,
  vencimentoEm,
} from "../mensalidades/regras.js";

/** GASTO-CA-03: R$ 1,00 a R$ 20.000,00 por mês, pago num dia de 1 a 28. */
export const CONTRATO_VALOR_MINIMO = 100;
export const CONTRATO_VALOR_MAXIMO = 2_000_000;
export const DIA_PAGAMENTO_MAXIMO = 28;

/** GASTO-CA-05: R$ 0,01 a R$ 100.000,00. */
export const GASTO_VALOR_MINIMO = 1;
export const GASTO_VALOR_MAXIMO = 10_000_000;

/** Os gastos que não são aluguel de quadra. */
export const CATEGORIAS_GASTO = ["EQUIPAMENTO", "INVESTIMENTO", "OUTRO_GASTO"] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

/** GASTO-CA-08: os tipos de saída do caixa, na ordem do Contábil. */
export const TIPOS_DE_SAIDA = [
  "ALUGUEL_MENSAL",
  "LOCACAO_AVULSA",
  "EQUIPAMENTO",
  "INVESTIMENTO",
  "OUTRO_GASTO",
] as const;
export type TipoDeSaida = (typeof TIPOS_DE_SAIDA)[number];

export const ehTipoDeSaida = (categoria: string): categoria is TipoDeSaida =>
  (TIPOS_DE_SAIDA as readonly string[]).includes(categoria);

export const NOMES_DAS_SAIDAS: Record<TipoDeSaida, string> = {
  ALUGUEL_MENSAL: "Aluguel mensal",
  LOCACAO_AVULSA: "Locação avulsa",
  EQUIPAMENTO: "Equipamento",
  INVESTIMENTO: "Investimento",
  OUTRO_GASTO: "Outro gasto",
};

export type ContratoParaLancar = {
  /** Mês de início, "AAAA-MM". */
  inicio: string;
  /** Mês a partir do qual não lança mais, "AAAA-MM"; null se vale. */
  fim: string | null;
  diaPagamento: number;
};

export type Parcela = { competencia: string; data: string };

/**
 * GASTO-CA-04: os meses do contrato cujo dia de pagamento já chegou até hoje, do início
 * até antes do encerramento. A saída entra no dia do pagamento ou, se o contrato foi
 * registrado depois dele, no dia do registro.
 */
export function parcelasDevidas(
  contrato: ContratoParaLancar,
  hoje: string,
  registradoEm: string,
): Parcela[] {
  const parcelas: Parcela[] = [];
  const ultimo = competenciaDe(hoje);
  for (
    let competencia = contrato.inicio;
    competencia <= ultimo && (contrato.fim === null || competencia < contrato.fim);
    competencia = proximaCompetencia(competencia)
  ) {
    const vencimento = vencimentoEm(competencia, contrato.diaPagamento);
    if (vencimento > hoje) break;
    parcelas.push({
      competencia,
      data: vencimento < registradoEm ? registradoEm : vencimento,
    });
  }
  return parcelas;
}

/** Chave do lançamento de um mês do contrato: um só por contrato e mês. */
export const origemDaParcela = (contratoId: string, competencia: string) =>
  `${contratoId}:${competencia}`;

/** "Terça, 19:00 às 20:00" */
export function descreverHorarioSemanal(h: {
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
}): string {
  return `${DIAS_DA_SEMANA[h.diaSemana]}, ${horaDe(h.horaInicio)} às ${horaDe(h.horaFim)}`;
}

/** "Aluguel mensal: Arena 2, terça 19:00 às 20:00, outubro de 2026" (até 200 caracteres). */
export function descricaoDaParcela(
  quadra: string,
  h: { diaSemana: number; horaInicio: number; horaFim: number },
  competencia: string,
): string {
  const horario = descreverHorarioSemanal(h).replace(",", "").toLowerCase();
  return `Aluguel mensal: ${quadra}, ${horario}, ${nomeDoMes(competencia)}`.slice(0, 200);
}

export type LancamentoDoCaixa = {
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  valorCentavos: number;
  /** "AAAA-MM-DD" */
  data: string;
};

/**
 * GASTO-CA-07: saldo em caixa. Sem saldo inicial, soma tudo; com ele, só o que entrou e
 * saiu a partir da data dele (o que veio antes já está contado no saldo inicial).
 */
export function saldoEmCaixa(lancamentos: readonly LancamentoDoCaixa[], desde: string | null) {
  let saldo = 0;
  for (const l of lancamentos) {
    if (desde !== null && l.data < desde) continue;
    saldo += l.tipo === "ENTRADA" ? l.valorCentavos : -l.valorCentavos;
  }
  return saldo;
}
