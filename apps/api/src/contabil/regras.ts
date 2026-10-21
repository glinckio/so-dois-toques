import { dataValida } from "../aulas/regras.js";
import { ehTipoDeSaida, TIPOS_DE_SAIDA, type TipoDeSaida } from "../gastos/regras.js";
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
  /** GASTO-CA-08: cada tipo de saída, já descontados os estornos dele. */
  gastos: Record<TipoDeSaida, number>;
  totalGastos: number;
  /** ENTRADA-CA-04: outras receitas lançadas à mão, já descontados os estornos delas. */
  outrasReceitas: number;
  /** Mensalidades (menos estornos) mais outras receitas, menos os gastos. */
  resultado: number;
  /** Saldo inicial do caixa: aparece à parte e não é receita. */
  saldoInicial: number;
  /** ENTRADA-CA-04: dinheiro que o dono pôs no caixa (menos estornos); não é receita. */
  aportes: number;
  /** Lançamento que não é de nenhum tipo conhecido; entra só na conferência. */
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
 * FOCO-CA-09, GASTO-CA-08 e ENTRADA-CA-04: receitas são as mensalidades (menos os
 * estornos delas) e as outras receitas; saídas são os gastos por tipo. O estorno de um
 * lançamento manual é o contrário dele, com o mesmo tipo, e desconta dele. O saldo
 * inicial e os aportes ficam à parte. O resultado confere com entradas − saídas do
 * livro-razão.
 */
export function resumoFinanceiro(lancamentos: readonly LancamentoContabil[]): ResumoFinanceiro {
  let recebido = 0;
  let estornos = 0;
  let saldoInicial = 0;
  let outrasReceitas = 0;
  let aportes = 0;
  let naoClassificado = 0;
  let entradas = 0;
  let saidas = 0;
  const gastos = Object.fromEntries(TIPOS_DE_SAIDA.map((t) => [t, 0])) as Record<
    TipoDeSaida,
    number
  >;
  for (const l of lancamentos) {
    const sinal = l.tipo === "ENTRADA" ? 1 : -1;
    if (l.tipo === "ENTRADA") entradas += l.valorCentavos;
    else saidas += l.valorCentavos;
    if (l.tipo === "ENTRADA" && l.categoria === "MENSALIDADE") recebido += l.valorCentavos;
    else if (l.tipo === "SAIDA" && l.categoria === "ESTORNO") estornos += l.valorCentavos;
    else if (l.tipo === "ENTRADA" && l.categoria === "SALDO_INICIAL")
      saldoInicial += l.valorCentavos;
    else if (ehTipoDeSaida(l.categoria)) gastos[l.categoria] -= sinal * l.valorCentavos;
    else if (l.categoria === "OUTRA_RECEITA") outrasReceitas += sinal * l.valorCentavos;
    else if (l.categoria === "APORTE") aportes += sinal * l.valorCentavos;
    else naoClassificado += sinal * l.valorCentavos;
  }
  const totalGastos = TIPOS_DE_SAIDA.reduce((total, t) => total + gastos[t], 0);
  const resultado = recebido - estornos + outrasReceitas - totalGastos;
  return {
    recebido,
    estornos,
    gastos,
    totalGastos,
    outrasReceitas,
    resultado,
    saldoInicial,
    aportes,
    naoClassificado,
    entradas,
    saidas,
    confere: resultado + saldoInicial + aportes + naoClassificado === entradas - saidas,
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
