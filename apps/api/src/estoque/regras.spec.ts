import { abaixoDoMinimo, agruparItens, custoMedio, totalDaVenda } from "./regras.js";

describe("ESTQ-CA-02: custo médio ponderado", () => {
  it("pondera o saldo atual com a compra", () => {
    // 10 a R$ 2,00 + 20 por R$ 50,00 (R$ 2,50 cada) = R$ 70,00 / 30 = R$ 2,33
    expect(custoMedio(10, 200, 20, 5000)).toBe(233);
    expect(custoMedio(0, 0, 12, 3000)).toBe(250);
  });

  it("saldo zerado passa a valer o custo da compra", () => {
    expect(custoMedio(0, 999, 4, 1000)).toBe(250);
    expect(custoMedio(-3, 999, 4, 1000)).toBe(250);
  });
});

describe("ESTQ-CA-03: venda com vários itens", () => {
  it("junta itens do mesmo produto e ordena pelo id", () => {
    expect(
      agruparItens([
        { produtoId: "b", quantidade: 1 },
        { produtoId: "a", quantidade: 2 },
        { produtoId: "b", quantidade: 3 },
      ]),
    ).toEqual([
      { produtoId: "a", quantidade: 2 },
      { produtoId: "b", quantidade: 4 },
    ]);
  });

  it("soma quantidade × preço", () => {
    expect(
      totalDaVenda([
        { quantidade: 2, precoCentavos: 650 },
        { quantidade: 1, precoCentavos: 1200 },
      ]),
    ).toBe(2500);
    expect(totalDaVenda([])).toBe(0);
  });
});

describe("ESTQ-CA-07: alerta de mínimo", () => {
  it("alerta no mínimo ou abaixo; mínimo zero não alerta", () => {
    expect(abaixoDoMinimo({ saldo: 5, estoqueMinimo: 5 })).toBe(true);
    expect(abaixoDoMinimo({ saldo: 2, estoqueMinimo: 5 })).toBe(true);
    expect(abaixoDoMinimo({ saldo: 6, estoqueMinimo: 5 })).toBe(false);
    expect(abaixoDoMinimo({ saldo: 0, estoqueMinimo: 0 })).toBe(false);
  });
});
