/** Regras puras do estoque da lanchonete (Etapa 6). Sem acesso a banco. */

export const PRECO_MAXIMO = 100_000;
export const QUANTIDADE_MAXIMA = 10_000;
export const COMPRA_MAXIMA = 10_000_000;
export const ITENS_POR_VENDA = 20;

/**
 * ESTQ-CA-02: custo médio ponderado depois de uma compra, por unidade, arredondado ao
 * centavo. Saldo zerado (ou negativo por segurança) passa a valer o custo da compra.
 */
export function custoMedio(
  saldo: number,
  custoAtualCentavos: number,
  quantidade: number,
  totalCentavos: number,
): number {
  const anterior = Math.max(saldo, 0);
  return Math.round((anterior * custoAtualCentavos + totalCentavos) / (anterior + quantidade));
}

type Item = { produtoId: string; quantidade: number };

/** Junta itens repetidos do mesmo produto e ordena por id (ordem das travas). */
export function agruparItens(itens: readonly Item[]): Item[] {
  const porProduto = new Map<string, number>();
  for (const item of itens) {
    porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + item.quantidade);
  }
  return [...porProduto.entries()]
    .map(([produtoId, quantidade]) => ({ produtoId, quantidade }))
    .sort((a, b) => (a.produtoId < b.produtoId ? -1 : a.produtoId > b.produtoId ? 1 : 0));
}

/** ESTQ-CA-03: soma de quantidade × preço de cada item. */
export function totalDaVenda(itens: readonly { quantidade: number; precoCentavos: number }[]) {
  return itens.reduce((total, i) => total + i.quantidade * i.precoCentavos, 0);
}

/** ESTQ-CA-07: está no mínimo ou abaixo dele (mínimo zero nunca alerta). */
export function abaixoDoMinimo(produto: { saldo: number; estoqueMinimo: number }): boolean {
  return produto.estoqueMinimo > 0 && produto.saldo <= produto.estoqueMinimo;
}
