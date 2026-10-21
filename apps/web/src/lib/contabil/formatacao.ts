import { formatarData } from "@/lib/aulas/formatacao";
import { competenciaValida, FORMAS } from "@/lib/mensalidades/formatacao";
import type { LancamentoExportado } from "./tipos";

/** As categorias do livro-razão na planilha (GASTO-CA-08 e ENTRADA-CA-04). */
export const CATEGORIAS: Record<string, string> = {
  MENSALIDADE: "Mensalidade",
  ESTORNO: "Estorno",
  SALDO_INICIAL: "Saldo inicial",
  ALUGUEL_MENSAL: "Aluguel mensal de quadra",
  LOCACAO_AVULSA: "Locação avulsa de quadra",
  EQUIPAMENTO: "Equipamento",
  INVESTIMENTO: "Investimento",
  OUTRO_GASTO: "Outro gasto",
  OUTRA_RECEITA: "Outra receita",
  APORTE: "Aporte",
};

export function nomeDaCategoria(categoria: string): string {
  return CATEGORIAS[categoria] ?? categoria;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** 72.2 → "72,2%"; null → "—". */
export function formatarPorcentagem(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/**
 * CONT-CA-03: a consulta da URL vira a consulta da API. Mês ou intervalo; o resto
 * é ignorado (a API confere a faixa e devolve a mensagem).
 */
export function consultaDoPeriodo(parametros: {
  competencia?: string | string[];
  de?: string | string[];
  ate?: string | string[];
}): string {
  const { competencia, de, ate } = parametros;
  if (typeof de === "string" && typeof ate === "string" && DATA.test(de) && DATA.test(ate)) {
    return `de=${de}&ate=${ate}`;
  }
  if (typeof competencia === "string" && competenciaValida(competencia)) {
    return `competencia=${competencia}`;
  }
  return "";
}

export function descreverPeriodo(de: string, ate: string): string {
  return de === ate ? formatarData(de) : `${formatarData(de)} a ${formatarData(ate)}`;
}

/** Centavos no formato do Excel em português, sem separador de milhar: "-1234,56". */
function valorCsv(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(centavos);
  return `${sinal}${Math.floor(absoluto / 100)},${String(absoluto % 100).padStart(2, "0")}`;
}

/** Aspas e proteção contra fórmula: texto que começa com = + - @ ganha um apóstrofo. */
function celulaCsv(texto: string): string {
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

const CABECALHO = ["Data", "Tipo", "Categoria", "Forma", "Valor (R$)", "Descrição", "Estorno"];

/** CONT-CA-09: planilha dos lançamentos, com BOM para o Excel ler os acentos. */
export function csvDosLancamentos(lancamentos: readonly LancamentoExportado[]): string {
  const linhas = lancamentos.map((l) =>
    [
      celulaCsv(formatarData(l.data)),
      celulaCsv(l.tipo === "ENTRADA" ? "Entrada" : "Saída"),
      celulaCsv(nomeDaCategoria(l.categoria)),
      celulaCsv(FORMAS[l.forma] ?? l.forma),
      valorCsv(l.tipo === "ENTRADA" ? l.valorCentavos : -l.valorCentavos),
      celulaCsv(l.descricao),
      celulaCsv(l.estorno ? "Sim" : "Não"),
    ].join(";"),
  );
  return `﻿${[CABECALHO.map(celulaCsv).join(";"), ...linhas].join("\r\n")}\r\n`;
}
