export const CATEGORIAS = {
  MENSALIDADE: "Mensalidade",
  ESTORNO: "Estorno",
  QUADRA_PARCEIRA: "Quadra parceira",
  SUPRIMENTO: "Suprimento",
  SANGRIA: "Sangria",
  DESPESA: "Despesa",
  RECEITA_AVULSA: "Receita avulsa",
  VENDA: "Venda",
  COMPRA_ESTOQUE: "Compra de estoque",
} as const;
export type Categoria = keyof typeof CATEGORIAS;

/** CAIXA-CA-02: o que cada avulso faz na gaveta. */
export const CATEGORIAS_AVULSAS = {
  SUPRIMENTO: { tipo: "ENTRADA", soDinheiro: true, ajuda: "Dinheiro que entra na gaveta (troco)" },
  SANGRIA: { tipo: "SAIDA", soDinheiro: true, ajuda: "Dinheiro que sai da gaveta (cofre, banco)" },
  DESPESA: { tipo: "SAIDA", soDinheiro: false, ajuda: "Pagamento de material, limpeza etc." },
  RECEITA_AVULSA: { tipo: "ENTRADA", soDinheiro: false, ajuda: "Entrada que não é mensalidade" },
} as const;
export type CategoriaAvulsa = keyof typeof CATEGORIAS_AVULSAS;

export function nomeDaCategoria(categoria: string): string {
  return Object.hasOwn(CATEGORIAS, categoria) ? CATEGORIAS[categoria as Categoria] : categoria;
}

export function ehAvulso(categoria: string): categoria is CategoriaAvulsa {
  return Object.hasOwn(CATEGORIAS_AVULSAS, categoria);
}
