import { dataValida, diaDaSemana } from "../aulas/regras.js";
import { somarDias } from "../horarios/regras.js";
import { competenciaDe, primeiroDia, proximaCompetencia } from "../mensalidades/regras.js";

export const DIAS_MAXIMOS = 366;
export const MESES_DO_COMPARATIVO = 12;

export const ORIGENS_RECEITA = {
  MENSALIDADE: "AULAS",
  ALUGUEL_QUADRA: "LOCACAO",
  VENDA: "LANCHONETE",
  RECEITA_AVULSA: "OUTRAS",
} as const;
export const TIPOS_DESPESA = {
  COMPRA_ESTOQUE: "ESTOQUE",
  QUADRA_PARCEIRA: "QUADRAS_PARCEIRAS",
  DESPESA: "OUTRAS",
} as const;
const GAVETA = new Set(["SUPRIMENTO", "SANGRIA"]);

type OrigemReceita = (typeof ORIGENS_RECEITA)[keyof typeof ORIGENS_RECEITA];
type TipoDespesa = (typeof TIPOS_DESPESA)[keyof typeof TIPOS_DESPESA];

export type LancamentoContabil = {
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  valorCentavos: number;
  /** Categoria do lançamento estornado, quando este é um estorno. */
  categoriaOriginal?: string | null;
};

export type ResumoFinanceiro = {
  receitas: Record<OrigemReceita, number>;
  despesas: Record<TipoDespesa, number>;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  margemPercentual: number | null;
  gaveta: number;
  /** Lançamentos de categoria que o painel não conhece; entram só na conferência. */
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
};

const zerado = <K extends string>(chaves: readonly K[]) =>
  Object.fromEntries(chaves.map((c) => [c, 0])) as Record<K, number>;

/** Uma casa decimal; null quando não há base. */
export function porcentagem(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((parte / total) * 1000) / 10;
}

/**
 * CONT-CA-01 e 02: receitas por origem e despesas por tipo, com o estorno descontado da
 * origem do lançamento estornado. Suprimento e sangria ficam à parte (gaveta).
 */
export function resumoFinanceiro(lancamentos: readonly LancamentoContabil[]): ResumoFinanceiro {
  const receitas = zerado(Object.values(ORIGENS_RECEITA));
  const despesas = zerado(Object.values(TIPOS_DESPESA));
  let gaveta = 0;
  let naoClassificado = 0;
  let entradas = 0;
  let saidas = 0;
  for (const l of lancamentos) {
    const comSinal = l.tipo === "ENTRADA" ? l.valorCentavos : -l.valorCentavos;
    if (l.tipo === "ENTRADA") entradas += l.valorCentavos;
    else saidas += l.valorCentavos;
    const categoria = l.categoria === "ESTORNO" ? (l.categoriaOriginal ?? "") : l.categoria;
    if (Object.hasOwn(ORIGENS_RECEITA, categoria)) {
      receitas[ORIGENS_RECEITA[categoria as keyof typeof ORIGENS_RECEITA]] += comSinal;
    } else if (Object.hasOwn(TIPOS_DESPESA, categoria)) {
      despesas[TIPOS_DESPESA[categoria as keyof typeof TIPOS_DESPESA]] -= comSinal;
    } else if (GAVETA.has(categoria)) {
      gaveta += comSinal;
    } else {
      naoClassificado += comSinal;
    }
  }
  const totalReceitas = Object.values(receitas).reduce((a, b) => a + b, 0);
  const totalDespesas = Object.values(despesas).reduce((a, b) => a + b, 0);
  const resultado = totalReceitas - totalDespesas;
  return {
    receitas,
    despesas,
    totalReceitas,
    totalDespesas,
    resultado,
    margemPercentual: porcentagem(resultado, totalReceitas),
    gaveta,
    naoClassificado,
    entradas,
    saidas,
    confere: resultado + gaveta + naoClassificado === entradas - saidas,
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

export const TURNOS = ["MANHA", "TARDE", "NOITE"] as const;
export type Turno = (typeof TURNOS)[number];

export function turnoDaHora(hora: number): Turno {
  if (hora < 12) return "MANHA";
  if (hora < 18) return "TARDE";
  return "NOITE";
}

type FaixaHoras = { diaSemana: number; horaInicio: number; horaFim: number };
type Ocupacao = {
  quadraId: string;
  data: string;
  tipo: "RESERVA" | "BLOQUEIO";
  horaInicio: number;
  horaFim: number;
};

export type OcupacaoTurno = {
  abertas: number;
  bloqueadas: number;
  reservadas: number;
  ocupacaoPercentual: number | null;
};

/**
 * CONT-CA-06: horas abertas (faixas de cada dia da semana), bloqueadas e reservadas por
 * quadra e turno. Ocupação = reservadas ÷ (abertas − bloqueadas).
 */
export function ocupacaoPorTurno(
  quadras: readonly string[],
  datas: readonly string[],
  faixas: readonly FaixaHoras[],
  ocupacoes: readonly Ocupacao[],
) {
  const abertasPorDia = Array.from({ length: 7 }, () => zerado(TURNOS));
  for (const f of faixas) {
    for (let h = f.horaInicio; h < f.horaFim; h++) {
      (abertasPorDia[f.diaSemana] as Record<Turno, number>)[turnoDaHora(h)] += 1;
    }
  }
  const abertas = zerado(TURNOS);
  for (const data of datas) {
    const doDia = abertasPorDia[diaDaSemana(data)] as Record<Turno, number>;
    for (const t of TURNOS) abertas[t] += doDia[t];
  }
  const resultado = new Map<string, Record<Turno, OcupacaoTurno>>();
  for (const quadraId of quadras) {
    const contas = Object.fromEntries(
      TURNOS.map((t) => [t, { abertas: abertas[t], bloqueadas: 0, reservadas: 0 }]),
    ) as Record<Turno, Omit<OcupacaoTurno, "ocupacaoPercentual">>;
    for (const o of ocupacoes) {
      if (o.quadraId !== quadraId) continue;
      for (let h = o.horaInicio; h < o.horaFim; h++) {
        const conta = contas[turnoDaHora(h)];
        if (o.tipo === "BLOQUEIO") conta.bloqueadas += 1;
        else conta.reservadas += 1;
      }
    }
    resultado.set(
      quadraId,
      Object.fromEntries(
        TURNOS.map((t) => [
          t,
          {
            ...contas[t],
            ocupacaoPercentual: porcentagem(
              contas[t].reservadas,
              contas[t].abertas - contas[t].bloqueadas,
            ),
          },
        ]),
      ) as Record<Turno, OcupacaoTurno>,
    );
  }
  return resultado;
}
