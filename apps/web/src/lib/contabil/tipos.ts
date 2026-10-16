import type { Forma } from "@/lib/mensalidades/formatacao";

/** GASTO-CA-08: os tipos de saída do caixa, na ordem do Contábil. */
export const TIPOS_DE_SAIDA = {
  ALUGUEL_MENSAL: "Aluguel mensal de quadra",
  LOCACAO_AVULSA: "Locação avulsa de quadra",
  EQUIPAMENTO: "Equipamentos",
  INVESTIMENTO: "Investimentos",
  OUTRO_GASTO: "Outros gastos",
} as const;
export type TipoDeSaida = keyof typeof TIPOS_DE_SAIDA;

/** GASTO-CA-07: saldo em caixa, a partir do saldo inicial. */
export type Caixa = {
  saldoInicial: { valorCentavos: number; data: string } | null;
  saldoCentavos: number;
};

/** FOCO-CA-09 e GASTO-CA-08: o Contábil (mensalidades, gastos e saldo em caixa). */
export type Painel = {
  periodo: { de: string; ate: string };
  recebido: number;
  estornos: number;
  gastos: Record<TipoDeSaida, number>;
  totalGastos: number;
  resultado: number;
  saldoInicial: number;
  caixa: Caixa;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  porForma: Record<Forma, { entradas: number; saidas: number; saldo: number }>;
  comparativo: {
    competencia: string;
    recebido: number;
    estornos: number;
    gastos: number;
    resultado: number;
  }[];
  aReceber: { quantidade: number; valorCentavos: number };
};

/** O comparativo no formato dos gráficos mensais: recebido e saídas (estornos e gastos). */
export function mesesDoGrafico(comparativo: Painel["comparativo"]) {
  return comparativo.map((m) => ({
    competencia: m.competencia,
    receitas: m.recebido,
    despesas: m.estornos + m.gastos,
    resultado: m.resultado,
  }));
}

export const NOMES_DO_GRAFICO = { receitas: "Recebido", despesas: "Saídas" };

/** GASTO-CA-05 e 06: uma saída do caixa (ou o estorno dela). */
export type Saida = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: TipoDeSaida;
  nomeCategoria: string;
  valorCentavos: number;
  forma: Forma;
  data: string;
  descricao: string;
  criadoPor: string;
  ehEstorno: boolean;
  estorno: { id: string; data: string; descricao: string } | null;
};

/** GASTO-CA-03: contrato mensal de quadra. */
export type Contrato = {
  id: string;
  quadra: { id: string; nome: string };
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  horario: string;
  valorCentavos: number;
  diaPagamento: number;
  forma: Forma;
  inicio: string;
  fim: string | null;
  vigente: boolean;
};

export type LancamentoExportado = {
  data: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  forma: Forma;
  valorCentavos: number;
  descricao: string;
  estorno: boolean;
};
