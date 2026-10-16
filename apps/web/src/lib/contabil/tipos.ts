import type { Forma } from "@/lib/mensalidades/formatacao";

/** FOCO-CA-09: o Contábil das mensalidades. */
export type Painel = {
  periodo: { de: string; ate: string };
  recebido: number;
  estornos: number;
  resultado: number;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  porForma: Record<Forma, { entradas: number; saidas: number; saldo: number }>;
  comparativo: { competencia: string; recebido: number; estornos: number; resultado: number }[];
  aReceber: { quantidade: number; valorCentavos: number };
};

/** O comparativo no formato dos gráficos mensais: recebido e estornos. */
export function mesesDoGrafico(comparativo: Painel["comparativo"]) {
  return comparativo.map((m) => ({
    competencia: m.competencia,
    receitas: m.recebido,
    despesas: m.estornos,
    resultado: m.resultado,
  }));
}

export const NOMES_DO_GRAFICO = { receitas: "Recebido", despesas: "Estornos" };

export type LancamentoExportado = {
  data: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  forma: Forma;
  valorCentavos: number;
  descricao: string;
  estorno: boolean;
};
