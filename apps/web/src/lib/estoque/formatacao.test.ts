import { describe, expect, it } from "vitest";
import { itensDoFormulario, totalPrevisto } from "./formatacao";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("ESTQ-CA-03: itens da venda na tela", () => {
  it("lê só os campos de quantidade preenchidos", () => {
    expect(
      itensDoFormulario([
        [`qtd-${A}`, "2"],
        [`qtd-${B}`, ""],
        ["forma", "PIX"],
        ["qtd-qualquer", "5"],
        [`qtd-${B}x`, "1"],
      ]),
    ).toEqual([{ produtoId: A, quantidade: 2 }]);
    expect(itensDoFormulario([[`qtd-${A}`, "0"]])).toEqual([]);
  });

  it("recusa quantidade que não é inteira", () => {
    expect(itensDoFormulario([[`qtd-${A}`, "1,5"]])).toBeNull();
    expect(itensDoFormulario([[`qtd-${A}`, "-1"]])).toBeNull();
  });

  it("calcula o total previsto", () => {
    const precos = new Map([
      [A, 500],
      [B, 800],
    ]);
    expect(
      totalPrevisto(
        [
          { produtoId: A, quantidade: 3 },
          { produtoId: B, quantidade: 1 },
        ],
        precos,
      ),
    ).toBe(2300);
  });
});
