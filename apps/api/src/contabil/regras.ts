import { dataValida } from "../aulas/regras.js";
import { somarDias } from "../horarios/regras.js";
import { competenciaDe, primeiroDia, proximaCompetencia } from "../mensalidades/regras.js";

export const DIAS_MAXIMOS = 366;
export const MESES_DO_COMPARATIVO = 12;

export type LancamentoContabil = {
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  valorCentavos: number;
};

export type ResumoFinanceiro = {
  /** Mensalidades recebidas no período. */
  recebido: number;
  /** Estornos de mensalidade feitos no período. */
  estornos: number;
  resultado: number;
  /** Lançamento que não é mensalidade nem estorno; entra só na conferência. */
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
};

/** Uma casa decimal; null quando não há base. */
export function porcentagem(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((parte / total) * 1000) / 10;
}

/**
 * FOCO-CA-09: o livro-razão só tem mensalidades (entradas) e estornos de mensalidade
 * (saídas). O resultado é o recebido menos os estornos e confere com entradas − saídas.
 */
export function resumoFinanceiro(lancamentos: readonly LancamentoContabil[]): ResumoFinanceiro {
  let recebido = 0;
  let estornos = 0;
  let naoClassificado = 0;
  let entradas = 0;
  let saidas = 0;
  for (const l of lancamentos) {
    if (l.tipo === "ENTRADA") entradas += l.valorCentavos;
    else saidas += l.valorCentavos;
    if (l.tipo === "ENTRADA" && l.categoria === "MENSALIDADE") recebido += l.valorCentavos;
    else if (l.tipo === "SAIDA" && l.categoria === "ESTORNO") estornos += l.valorCentavos;
    else naoClassificado += l.tipo === "ENTRADA" ? l.valorCentavos : -l.valorCentavos;
  }
  const resultado = recebido - estornos;
  return {
    recebido,
    estornos,
    resultado,
    naoClassificado,
    entradas,
    saidas,
    confere: resultado + naoClassificado === entradas - saidas,
  };
}

export type Periodo = { de: string; ate: string };
export type ProblemaDePeriodo = "DATA_INVALIDA" | "INVERTIDO" | "LONGO";

export const MENSAGENS_PERIODO: Record<ProblemaDePeriodo, string> = {
  DATA_INVALIDA: "Data inválida.",
  INVERTIDO: "O início precisa ser antes do fim.",
  LONGO: `O período vai até ${DIAS_MAXIMOS} dias.`,
};

/** CONT-CA-03 */
export function problemaDePeriodo({ de, ate }: Periodo): ProblemaDePeriodo | null {
  if (!dataValida(de) || !dataValida(ate)) return "DATA_INVALIDA";
  if (ate < de) return "INVERTIDO";
  if (somarDias(de, DIAS_MAXIMOS - 1) < ate) return "LONGO";
  return null;
}

export function periodoDoMes(competencia: string): Periodo {
  return {
    de: primeiroDia(competencia),
    ate: somarDias(primeiroDia(proximaCompetencia(competencia)), -1),
  };
}

/** CONT-CA-04: os 12 meses ("AAAA-MM") que terminam no mês da data. */
export function mesesAte(data: string, quantos = MESES_DO_COMPARATIVO): string[] {
  const meses = [competenciaDe(data)];
  while (meses.length < quantos) {
    const [ano, mes] = (meses[0] as string).split("-").map(Number) as [number, number];
    meses.unshift(mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`);
  }
  return meses;
}

export function datasDoPeriodo({ de, ate }: Periodo): string[] {
  const datas: string[] = [];
  for (let data = de; data <= ate; data = somarDias(data, 1)) datas.push(data);
  return datas;
}
