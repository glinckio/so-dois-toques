import { describe, expect, it } from "vitest";
import { ehAvulso, nomeDaCategoria } from "./formatacao";

describe("CAIXA-CA-05: categorias na tela", () => {
  it("dá nome às categorias e reconhece os avulsos", () => {
    expect(nomeDaCategoria("SANGRIA")).toBe("Sangria");
    expect(nomeDaCategoria("QUADRA_PARCEIRA")).toBe("Quadra parceira");
    expect(nomeDaCategoria("OUTRA")).toBe("OUTRA");
    expect(ehAvulso("DESPESA")).toBe(true);
    expect(ehAvulso("MENSALIDADE")).toBe(false);
    expect(ehAvulso("toString")).toBe(false);
  });
});
