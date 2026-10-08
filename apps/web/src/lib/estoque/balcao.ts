import { itensDoFormulario, totalPrevisto } from "./formatacao";

/** Produto como aparece no balcão de venda. */
export type ProdutoDoBalcao = {
  id: string;
  nome: string;
  precoCentavos: number;
  saldo: number;
};

/** Um produto no balcão, com a quantidade escolhida e o que os botões podem fazer. */
export type LinhaDoBalcao = ProdutoDoBalcao & {
  quantidade: number;
  subtotalCentavos: number;
  /** O "+" só funciona enquanto a quantidade está abaixo do saldo. */
  podeMais: boolean;
  /** O "−" só funciona enquanto há quantidade escolhida. */
  podeMenos: boolean;
  /** Quantidade digitada acima do saldo (a API recusaria a venda). */
  acimaDoSaldo: boolean;
};

export type ResumoDoBalcao = {
  linhas: LinhaDoBalcao[];
  /** Só os produtos com quantidade, na ordem do balcão. */
  escolhidos: LinhaDoBalcao[];
  unidades: number;
  totalCentavos: number;
  /** Falso quando alguma quantidade digitada não é um inteiro (a venda seria recusada). */
  valido: boolean;
};

/** Quantidade digitada no campo ("" ou algo que não é inteiro conta como zero). */
export function lerQuantidade(texto: string | undefined): number {
  const limpo = (texto ?? "").trim();
  return /^\d+$/.test(limpo) ? Number(limpo) : 0;
}

/**
 * VIVO-CA-07: quantidade depois de um toque no "+" (passo 1) ou no "−" (passo -1).
 * Nunca passa do saldo nem fica abaixo de zero; se alguém digitou acima do saldo,
 * o "−" já traz de volta para dentro do saldo.
 */
export function quantidadeDepoisDoToque(atual: string, passo: 1 | -1, saldo: number): number {
  const limite = Math.max(0, saldo);
  return Math.min(limite, Math.max(0, lerQuantidade(atual) + passo));
}

/** Texto do campo para uma quantidade: zero deixa o campo vazio (mostra o "0" de exemplo). */
export function textoDaQuantidade(quantidade: number): string {
  return quantidade > 0 ? String(quantidade) : "";
}

/**
 * VIVO-CA-07: o balcão inteiro a partir das quantidades digitadas ou tocadas
 * (`quantidades[id]` = texto do campo `qtd-<id>`). O total segue a mesma leitura do
 * formulário enviado: quantidade que não é inteira zera a previsão.
 */
export function resumoDoBalcao(
  produtos: readonly ProdutoDoBalcao[],
  quantidades: Readonly<Record<string, string>>,
): ResumoDoBalcao {
  const itens = itensDoFormulario(
    produtos.map((p): [string, string] => [`qtd-${p.id}`, quantidades[p.id] ?? ""]),
  );
  const precos = new Map(produtos.map((p) => [p.id, p.precoCentavos]));
  const linhas = produtos.map((p): LinhaDoBalcao => {
    const quantidade = lerQuantidade(quantidades[p.id]);
    return {
      ...p,
      quantidade,
      subtotalCentavos: quantidade * p.precoCentavos,
      podeMais: quantidade < p.saldo,
      podeMenos: quantidade > 0,
      acimaDoSaldo: quantidade > p.saldo,
    };
  });
  const escolhidos = linhas.filter((l) => l.quantidade > 0);
  return {
    linhas,
    escolhidos,
    unidades: escolhidos.reduce((total, l) => total + l.quantidade, 0),
    totalCentavos: totalPrevisto(itens ?? [], precos),
    valido: itens !== null,
  };
}

/** Quantidades devolvidas pela ação (campos "qtd-<id>") para o estado do balcão. */
export function quantidadesDosValores(
  valores: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const quantidades: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(valores ?? {})) {
    if (campo.startsWith("qtd-")) quantidades[campo.slice(4)] = valor;
  }
  return quantidades;
}

/** Produtos com saldo primeiro; os esgotados vão para o fim, na mesma ordem. */
export function ordemDoBalcao<T extends { saldo: number }>(produtos: readonly T[]): T[] {
  return [...produtos.filter((p) => p.saldo > 0), ...produtos.filter((p) => p.saldo <= 0)];
}
