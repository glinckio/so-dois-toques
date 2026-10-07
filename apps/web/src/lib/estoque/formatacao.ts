export const TIPOS_MOVIMENTO = {
  COMPRA: "Compra",
  VENDA: "Venda",
  AJUSTE: "Ajuste",
  ESTORNO_VENDA: "Estorno de venda",
  ESTORNO_COMPRA: "Estorno de compra",
} as const;

/** Campo de quantidade de um produto no formulário de venda. */
export const CAMPO_QUANTIDADE =
  /^qtd-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Itens da venda a partir dos campos "qtd-<produto>" (quantidade vazia ou zero fica de fora). */
export function itensDoFormulario(
  campos: Iterable<[string, unknown]>,
): { produtoId: string; quantidade: number }[] | null {
  const itens: { produtoId: string; quantidade: number }[] = [];
  for (const [nome, valor] of campos) {
    const produto = CAMPO_QUANTIDADE.exec(nome);
    if (!produto || typeof valor !== "string" || valor.trim() === "") continue;
    if (!/^\d+$/.test(valor.trim())) return null;
    const quantidade = Number(valor.trim());
    if (quantidade > 0) itens.push({ produtoId: produto[1]!, quantidade });
  }
  return itens;
}

/** Total da venda na tela, antes de enviar (a API recalcula com o preço atual). */
export function totalPrevisto(
  itens: readonly { produtoId: string; quantidade: number }[],
  precos: ReadonlyMap<string, number>,
): number {
  return itens.reduce((total, i) => total + i.quantidade * (precos.get(i.produtoId) ?? 0), 0);
}
