import {
  ehCategoriaAvulsa,
  esperadoEmDinheiro,
  formaPermitida,
  resumoPorCategoria,
} from "./regras.js";

const l = (
  tipo: "ENTRADA" | "SAIDA",
  valorCentavos: number,
  forma: "PIX" | "DINHEIRO" | "CARTAO_DEBITO" | "CARTAO_CREDITO" = "DINHEIRO",
  categoria = "MENSALIDADE",
) => ({ tipo, valorCentavos, forma, categoria });

describe("CAIXA-CA-02: categorias avulsas", () => {
  it("suprimento e sangria só em dinheiro; despesa e receita em qualquer forma", () => {
    expect(formaPermitida("SUPRIMENTO", "DINHEIRO")).toBe(true);
    expect(formaPermitida("SUPRIMENTO", "PIX")).toBe(false);
    expect(formaPermitida("SANGRIA", "CARTAO_DEBITO")).toBe(false);
    expect(formaPermitida("DESPESA", "PIX")).toBe(true);
    expect(formaPermitida("RECEITA_AVULSA", "CARTAO_CREDITO")).toBe(true);
  });

  it("reconhece só as categorias avulsas", () => {
    expect(ehCategoriaAvulsa("SANGRIA")).toBe(true);
    expect(ehCategoriaAvulsa("MENSALIDADE")).toBe(false);
    expect(ehCategoriaAvulsa("toString")).toBe(false);
  });
});

describe("CAIXA-CA-04: esperado em dinheiro", () => {
  it("soma o troco e as entradas e tira as saídas, só em dinheiro", () => {
    expect(
      esperadoEmDinheiro(10000, [
        l("ENTRADA", 15000),
        l("ENTRADA", 9000, "PIX"),
        l("SAIDA", 2500),
        l("SAIDA", 3000, "CARTAO_DEBITO"),
      ]),
    ).toBe(22500);
    expect(esperadoEmDinheiro(5000, [])).toBe(5000);
  });

  it("pode ficar negativo quando sai mais do que havia", () => {
    expect(esperadoEmDinheiro(0, [l("SAIDA", 100)])).toBe(-100);
  });
});

describe("CAIXA-CA-05: resumo por categoria", () => {
  it("separa entradas e saídas de cada categoria", () => {
    expect(
      resumoPorCategoria([
        l("ENTRADA", 15000),
        l("ENTRADA", 5000, "PIX"),
        l("SAIDA", 15000, "DINHEIRO", "ESTORNO"),
        l("SAIDA", 2000, "DINHEIRO", "SANGRIA"),
        l("ENTRADA", 700, "DINHEIRO", "ESTORNO"),
      ]),
    ).toEqual([
      { categoria: "MENSALIDADE", entradas: 20000, saidas: 0 },
      { categoria: "ESTORNO", entradas: 700, saidas: 15000 },
      { categoria: "SANGRIA", entradas: 0, saidas: 2000 },
    ]);
  });
});
