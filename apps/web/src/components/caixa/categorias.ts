import type { Tom } from "@/components/base/selo";
import type { NomeIcone } from "@/components/icones";

/** Ícone e cor de cada categoria do livro-razão, nos selos da linha do tempo. */
const CATEGORIAS: Record<string, { icone: NomeIcone; tom: Tom }> = {
  MENSALIDADE: { icone: "aulas", tom: "roxo" },
  ESTORNO: { icone: "estorno", tom: "neutro" },
  QUADRA_PARCEIRA: { icone: "local", tom: "areia" },
  SUPRIMENTO: { icone: "entrada", tom: "sucesso" },
  SANGRIA: { icone: "saida", tom: "ouro" },
  DESPESA: { icone: "recibo", tom: "perigo" },
  RECEITA_AVULSA: { icone: "estrela", tom: "sucesso" },
  VENDA: { icone: "carrinho", tom: "ouro" },
  COMPRA_ESTOQUE: { icone: "sacola", tom: "areia" },
  ALUGUEL_QUADRA: { icone: "horarios", tom: "roxo" },
};

export function visualDaCategoria(categoria: string): { icone: NomeIcone; tom: Tom } {
  return Object.hasOwn(CATEGORIAS, categoria)
    ? CATEGORIAS[categoria]!
    : { icone: "lista", tom: "neutro" };
}
