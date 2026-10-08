import { describe, expect, it } from "vitest";
import {
  custoMedioPrevisto,
  custoPorUnidade,
  formatarMargem,
  margemSobrePreco,
  nivelDoEstoque,
  quando,
  resumoDasVendas,
  saldoDepoisDoAjuste,
  valorEmEstoque,
} from "./resumos";
import type { VendasDoDia } from "./tipos";

describe("ESTQ-CA-07: nível do estoque nos cartões", () => {
  it("a barra enche no dobro do mínimo, com a marca no meio", () => {
    expect(nivelDoEstoque({ saldo: 3, estoqueMinimo: 6, abaixoDoMinimo: true })).toEqual({
      fracao: 0.25,
      marca: 0.5,
      situacao: "baixo",
    });
    expect(nivelDoEstoque({ saldo: 40, estoqueMinimo: 6, abaixoDoMinimo: false })).toEqual({
      fracao: 1,
      marca: 0.5,
      situacao: "ok",
    });
  });

  it("zerado fica vazio e em vermelho; sem mínimo não há marca", () => {
    expect(nivelDoEstoque({ saldo: 0, estoqueMinimo: 6, abaixoDoMinimo: true })).toMatchObject({
      fracao: 0,
      situacao: "zerado",
    });
    expect(nivelDoEstoque({ saldo: 5, estoqueMinimo: 0, abaixoDoMinimo: false })).toEqual({
      fracao: 1,
      marca: undefined,
      situacao: "ok",
    });
    expect(nivelDoEstoque({ saldo: 0, estoqueMinimo: 0, abaixoDoMinimo: false })).toMatchObject({
      fracao: 0,
      situacao: "zerado",
    });
  });
});

describe("ESTQ-CA-07: valores do estoque", () => {
  it("soma o que está na prateleira pelo custo e pelo preço, só dos ativos", () => {
    expect(
      valorEmEstoque([
        { saldo: 10, custoMedioCentavos: 200, precoCentavos: 500, ativo: true },
        { saldo: 2, custoMedioCentavos: 300, precoCentavos: 800, ativo: true },
        { saldo: 0, custoMedioCentavos: 900, precoCentavos: 900, ativo: true },
        { saldo: 50, custoMedioCentavos: 100, precoCentavos: 300, ativo: false },
      ]),
    ).toEqual({ custoCentavos: 2600, vendaCentavos: 6600, unidades: 12 });
  });

  it("margem sobre o preço; sem custo ainda, não há margem", () => {
    expect(margemSobrePreco(500, 200)).toBeCloseTo(0.6);
    expect(margemSobrePreco(500, 600)).toBeCloseTo(-0.2);
    expect(margemSobrePreco(500, 0)).toBeNull();
    expect(margemSobrePreco(0, 100)).toBeNull();
    expect(formatarMargem(0.604)).toBe("60%");
    expect(formatarMargem(-0.2)).toBe("-20%");
  });
});

describe("ESTQ-CA-02: previsão da compra", () => {
  it("custo por unidade arredondado ao centavo", () => {
    expect(custoPorUnidade(1200, 6)).toBe(200);
    expect(custoPorUnidade(1000, 3)).toBe(333);
    expect(custoPorUnidade(null, 3)).toBeNull();
    expect(custoPorUnidade(1000, 0)).toBeNull();
    expect(custoPorUnidade(1000, 1.5)).toBeNull();
  });

  it("custo médio previsto com a mesma conta da API", () => {
    expect(custoMedioPrevisto(0, 0, 6, 1200)).toBe(200);
    expect(custoMedioPrevisto(4, 250, 6, 1200)).toBe(220);
    expect(custoMedioPrevisto(-2, 250, 3, 900)).toBe(300);
  });
});

describe("ESTQ-CA-05: previsão do ajuste", () => {
  it("mostra o saldo depois do ajuste digitado", () => {
    expect(saldoDepoisDoAjuste(6, "-1")).toBe(5);
    expect(saldoDepoisDoAjuste(6, " 4 ")).toBe(10);
    expect(saldoDepoisDoAjuste(1, "-3")).toBe(-2);
    expect(saldoDepoisDoAjuste(6, "")).toBeNull();
    expect(saldoDepoisDoAjuste(6, "0")).toBeNull();
    expect(saldoDepoisDoAjuste(6, "1,5")).toBeNull();
    expect(saldoDepoisDoAjuste(6, "-")).toBeNull();
  });
});

describe("ESTQ-CA-03: números das vendas do dia", () => {
  const venda = (
    id: string,
    forma: VendasDoDia["vendas"][number]["forma"],
    totalCentavos: number,
    itens: [string, number][],
    estornada = false,
  ): VendasDoDia["vendas"][number] => ({
    id,
    forma,
    totalCentavos,
    feitaPor: "Iara",
    feitaEm: "2026-10-07T17:32:00.000Z",
    estornadaEm: estornada ? "2026-10-07T18:00:00.000Z" : null,
    motivoEstorno: estornada ? "Desistiu" : null,
    itens: itens.map(([produto, quantidade]) => ({ produto, quantidade, precoCentavos: 500 })),
  });

  it("separa por forma e lista os mais vendidos, sem as estornadas", () => {
    const resumo = resumoDasVendas([
      venda("a", "PIX", 1500, [
        ["Água", 2],
        ["Suco", 1],
      ]),
      venda("b", "DINHEIRO", 1000, [["Água", 2]]),
      venda("c", "PIX", 500, [["Suco", 1]]),
      venda("d", "CARTAO_CREDITO", 9900, [["Picolé", 9]], true),
    ]);
    expect(resumo.quantidade).toBe(3);
    expect(resumo.estornadas).toBe(1);
    expect(resumo.unidades).toBe(6);
    expect(resumo.porForma).toEqual([
      { forma: "PIX", totalCentavos: 2000, vendas: 2 },
      { forma: "DINHEIRO", totalCentavos: 1000, vendas: 1 },
      { forma: "CARTAO_DEBITO", totalCentavos: 0, vendas: 0 },
      { forma: "CARTAO_CREDITO", totalCentavos: 0, vendas: 0 },
    ]);
    expect(resumo.maisVendidos).toEqual([
      { produto: "Água", quantidade: 4 },
      { produto: "Suco", quantidade: 2 },
    ]);
  });

  it("empate nos mais vendidos fica em ordem alfabética", () => {
    const resumo = resumoDasVendas([
      venda("a", "PIX", 1000, [
        ["Suco", 1],
        ["Água", 1],
      ]),
    ]);
    expect(resumo.maisVendidos.map((p) => p.produto)).toEqual(["Água", "Suco"]);
  });
});

describe("hora dos movimentos", () => {
  it("dia e hora em São Paulo", () => {
    expect(quando("2026-10-07T17:32:00.000Z")).toEqual({ dia: "07/10/2026", hora: "14:32" });
    expect(quando("2026-10-08T01:05:00.000Z")).toEqual({ dia: "07/10/2026", hora: "22:05" });
  });
});
