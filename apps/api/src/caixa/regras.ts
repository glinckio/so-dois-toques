/** Regras puras do Caixa: turnos e lançamentos avulsos (Etapa 5). Sem acesso a banco. */

import type { FormaPagamento } from "../mensalidades/regras.js";

export const TROCO_MAXIMO = 1_000_000;
export const AVULSO_MAXIMO = 10_000_000;

type Tipo = "ENTRADA" | "SAIDA";

/** CAIXA-CA-02: suprimento e sangria mexem só no dinheiro da gaveta. */
export const CATEGORIAS_AVULSAS = {
  SUPRIMENTO: { tipo: "ENTRADA", soDinheiro: true },
  SANGRIA: { tipo: "SAIDA", soDinheiro: true },
  DESPESA: { tipo: "SAIDA", soDinheiro: false },
  RECEITA_AVULSA: { tipo: "ENTRADA", soDinheiro: false },
} as const satisfies Record<string, { tipo: Tipo; soDinheiro: boolean }>;
export type CategoriaAvulsa = keyof typeof CATEGORIAS_AVULSAS;
export const NOMES_CATEGORIAS_AVULSAS = Object.keys(CATEGORIAS_AVULSAS) as [
  CategoriaAvulsa,
  ...CategoriaAvulsa[],
];

export function ehCategoriaAvulsa(categoria: string): categoria is CategoriaAvulsa {
  return Object.hasOwn(CATEGORIAS_AVULSAS, categoria);
}

/** A forma escolhida vale para a categoria? */
export function formaPermitida(categoria: CategoriaAvulsa, forma: FormaPagamento): boolean {
  return !CATEGORIAS_AVULSAS[categoria].soDinheiro || forma === "DINHEIRO";
}

type Lancamento = { tipo: Tipo; forma: FormaPagamento; categoria: string; valorCentavos: number };

/** CAIXA-CA-04: troco + entradas em dinheiro − saídas em dinheiro do turno. */
export function esperadoEmDinheiro(
  trocoInicialCentavos: number,
  lancamentos: readonly Lancamento[],
): number {
  return lancamentos
    .filter((l) => l.forma === "DINHEIRO")
    .reduce(
      (total, l) => total + (l.tipo === "ENTRADA" ? 1 : -1) * l.valorCentavos,
      trocoInicialCentavos,
    );
}

/** CAIXA-CA-05: entradas e saídas por categoria, na ordem em que aparecem. */
export function resumoPorCategoria(lancamentos: readonly Lancamento[]) {
  const porCategoria = new Map<string, { categoria: string; entradas: number; saidas: number }>();
  for (const l of lancamentos) {
    const linha = porCategoria.get(l.categoria) ?? {
      categoria: l.categoria,
      entradas: 0,
      saidas: 0,
    };
    if (l.tipo === "ENTRADA") linha.entradas += l.valorCentavos;
    else linha.saidas += l.valorCentavos;
    porCategoria.set(l.categoria, linha);
  }
  return [...porCategoria.values()];
}
