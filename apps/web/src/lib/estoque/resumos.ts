import type { Forma } from "@/lib/mensalidades/formatacao";
import type { Produto, VendasDoDia } from "./tipos";

export type Situacao = "zerado" | "baixo" | "ok";

/** Formas de pagamento em rótulo curto, para os blocos de escolha. */
export const FORMAS_CURTAS: Record<Forma, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO_DEBITO: "Débito",
  CARTAO_CREDITO: "Crédito",
};

/**
 * Nível do estoque para a barra: cheia no dobro do mínimo, com a marca no mínimo.
 * Sem mínimo, a barra fica cheia se há saldo. A situação segue o alerta da API.
 */
export function nivelDoEstoque(
  produto: Pick<Produto, "saldo" | "estoqueMinimo" | "abaixoDoMinimo">,
): {
  fracao: number;
  marca: number | undefined;
  situacao: Situacao;
} {
  const situacao: Situacao =
    produto.saldo <= 0 ? "zerado" : produto.abaixoDoMinimo ? "baixo" : "ok";
  if (produto.estoqueMinimo <= 0) {
    return { fracao: produto.saldo > 0 ? 1 : 0, marca: undefined, situacao };
  }
  const escala = produto.estoqueMinimo * 2;
  return {
    fracao: Math.min(1, Math.max(0, produto.saldo) / escala),
    marca: 0.5,
    situacao,
  };
}

/** Quanto vale o que está na prateleira: pelo custo médio e pelo preço de venda. */
export function valorEmEstoque(
  produtos: readonly Pick<Produto, "saldo" | "custoMedioCentavos" | "precoCentavos" | "ativo">[],
): { custoCentavos: number; vendaCentavos: number; unidades: number } {
  return produtos
    .filter((p) => p.ativo && p.saldo > 0)
    .reduce(
      (total, p) => ({
        custoCentavos: total.custoCentavos + p.saldo * p.custoMedioCentavos,
        vendaCentavos: total.vendaCentavos + p.saldo * p.precoCentavos,
        unidades: total.unidades + p.saldo,
      }),
      { custoCentavos: 0, vendaCentavos: 0, unidades: 0 },
    );
}

/** Margem sobre o preço (0,6 = 60%). Sem custo ainda (nunca comprado) ou sem preço: null. */
export function margemSobrePreco(precoCentavos: number, custoCentavos: number): number | null {
  if (precoCentavos <= 0 || custoCentavos <= 0) return null;
  return (precoCentavos - custoCentavos) / precoCentavos;
}

/** 0,604 → "60%"; -0,1 → "-10%". */
export function formatarMargem(margem: number): string {
  return `${Math.round(margem * 100)}%`;
}

/** Custo de cada unidade na compra, arredondado ao centavo. */
export function custoPorUnidade(totalCentavos: number | null, quantidade: number): number | null {
  if (totalCentavos === null || !Number.isInteger(quantidade) || quantidade <= 0) return null;
  return Math.round(totalCentavos / quantidade);
}

/**
 * Previsão do custo médio depois da compra, com a mesma conta da API (média ponderada;
 * saldo zerado passa a valer o custo da compra). A API recalcula ao registrar.
 */
export function custoMedioPrevisto(
  saldo: number,
  custoAtualCentavos: number,
  quantidade: number,
  totalCentavos: number,
): number {
  const anterior = Math.max(saldo, 0);
  return Math.round((anterior * custoAtualCentavos + totalCentavos) / (anterior + quantidade));
}

/** Saldo depois do ajuste digitado ("-2", "5"); null enquanto não é um inteiro diferente de zero. */
export function saldoDepoisDoAjuste(saldo: number, digitado: string): number | null {
  const limpo = digitado.trim();
  if (!/^-?\d+$/.test(limpo) || Number(limpo) === 0) return null;
  return saldo + Number(limpo);
}

/** Números do dia: vendas válidas (sem as estornadas), por forma e os mais vendidos. */
export function resumoDasVendas(vendas: VendasDoDia["vendas"]): {
  quantidade: number;
  estornadas: number;
  unidades: number;
  porForma: { forma: Forma; totalCentavos: number; vendas: number }[];
  maisVendidos: { produto: string; quantidade: number }[];
} {
  const validas = vendas.filter((v) => !v.estornadaEm);
  const porForma = new Map<Forma, { totalCentavos: number; vendas: number }>();
  const porProduto = new Map<string, number>();
  for (const venda of validas) {
    const forma = porForma.get(venda.forma) ?? { totalCentavos: 0, vendas: 0 };
    porForma.set(venda.forma, {
      totalCentavos: forma.totalCentavos + venda.totalCentavos,
      vendas: forma.vendas + 1,
    });
    for (const item of venda.itens) {
      porProduto.set(item.produto, (porProduto.get(item.produto) ?? 0) + item.quantidade);
    }
  }
  return {
    quantidade: validas.length,
    estornadas: vendas.length - validas.length,
    unidades: [...porProduto.values()].reduce((total, q) => total + q, 0),
    porForma: (Object.keys(FORMAS_CURTAS) as Forma[]).map((forma) => ({
      forma,
      totalCentavos: porForma.get(forma)?.totalCentavos ?? 0,
      vendas: porForma.get(forma)?.vendas ?? 0,
    })),
    maisVendidos: [...porProduto.entries()]
      .map(([produto, quantidade]) => ({ produto, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.produto.localeCompare(b.produto, "pt-BR")),
  };
}

const DIA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Instante da API em dia e hora de São Paulo: { dia: "07/10/2026", hora: "14:32" }. */
export function quando(iso: string): { dia: string; hora: string } {
  const instante = new Date(iso);
  return { dia: DIA.format(instante), hora: HORA.format(instante) };
}
