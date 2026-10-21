import { describe, expect, it } from "vitest";
import {
  descricaoDaParcela,
  ehTipoDeEntrada,
  estornavelNoCaixa,
  origemDaParcela,
  parcelasDevidas,
  saldoEmCaixa,
  type LancamentoDoCaixa,
} from "./regras.js";

describe("GASTO-CA-04: meses do contrato a lançar", () => {
  const contrato = { inicio: "2026-10", fim: null, diaPagamento: 10 };

  it("lança no dia do pagamento de cada mês, até hoje", () => {
    expect(parcelasDevidas(contrato, "2026-12-09", "2026-10-01")).toEqual([
      { competencia: "2026-10", data: "2026-10-10" },
      { competencia: "2026-11", data: "2026-11-10" },
    ]);
    expect(parcelasDevidas(contrato, "2026-12-10", "2026-10-01")).toHaveLength(3);
  });

  it("nada antes do primeiro dia de pagamento", () => {
    expect(parcelasDevidas(contrato, "2026-10-09", "2026-10-01")).toEqual([]);
  });

  it("contrato registrado depois do dia do pagamento lança o mês no dia do registro", () => {
    expect(parcelasDevidas(contrato, "2026-10-16", "2026-10-16")).toEqual([
      { competencia: "2026-10", data: "2026-10-16" },
    ]);
  });

  it("contrato encerrado não lança a partir do mês do encerramento", () => {
    const encerrado = { ...contrato, fim: "2026-12" };
    expect(
      parcelasDevidas(encerrado, "2027-03-20", "2026-10-01").map((p) => p.competencia),
    ).toEqual(["2026-10", "2026-11"]);
  });

  it("vira o ano", () => {
    const dezembro = { inicio: "2026-12", fim: null, diaPagamento: 28 };
    expect(parcelasDevidas(dezembro, "2027-01-28", "2026-12-01")).toEqual([
      { competencia: "2026-12", data: "2026-12-28" },
      { competencia: "2027-01", data: "2027-01-28" },
    ]);
  });

  it("chave única e descrição do lançamento", () => {
    expect(origemDaParcela("abc", "2026-10")).toBe("abc:2026-10");
    expect(
      descricaoDaParcela("Arena 2", { diaSemana: 2, horaInicio: 1140, horaFim: 1200 }, "2026-10"),
    ).toBe("Aluguel mensal: Arena 2, terça 19:00 às 20:00, outubro de 2026");
  });
});

describe("GASTO-CA-07: saldo em caixa", () => {
  const l = (tipo: "ENTRADA" | "SAIDA", valorCentavos: number, data: string, categoria = "X") =>
    ({ tipo, valorCentavos, data, categoria }) as LancamentoDoCaixa;

  it("saldo inicial mais entradas menos saídas a partir da data dele", () => {
    const lancamentos = [
      l("ENTRADA", 50000, "2026-10-01", "MENSALIDADE"),
      l("ENTRADA", 60000, "2026-10-16", "SALDO_INICIAL"),
      l("ENTRADA", 15000, "2026-10-17", "MENSALIDADE"),
      l("SAIDA", 8000, "2026-10-20", "ALUGUEL_MENSAL"),
    ];
    expect(saldoEmCaixa(lancamentos, "2026-10-16")).toBe(67000);
  });

  it("sem saldo inicial soma tudo", () => {
    expect(
      saldoEmCaixa([l("ENTRADA", 100, "2026-01-01"), l("SAIDA", 30, "2026-02-01")], null),
    ).toBe(70);
  });
});

describe("ENTRADA-CA-03: o que se estorna no caixa", () => {
  it("estorna gasto e entrada manual, mas não mensalidade, saldo inicial nem estorno", () => {
    const l = (tipo: "ENTRADA" | "SAIDA", categoria: string, estornoDeId: string | null = null) =>
      estornavelNoCaixa({ tipo, categoria, estornoDeId });
    expect(l("SAIDA", "EQUIPAMENTO")).toBe(true);
    expect(l("SAIDA", "ALUGUEL_MENSAL")).toBe(true);
    expect(l("ENTRADA", "OUTRA_RECEITA")).toBe(true);
    expect(l("ENTRADA", "APORTE")).toBe(true);
    expect(l("ENTRADA", "EQUIPAMENTO", "id")).toBe(false);
    expect(l("SAIDA", "APORTE", "id")).toBe(false);
    expect(l("ENTRADA", "MENSALIDADE")).toBe(false);
    expect(l("ENTRADA", "SALDO_INICIAL")).toBe(false);
    expect(l("SAIDA", "ESTORNO")).toBe(false);
    // Tipo trocado (entrada de gasto, saída de aporte) só existe como estorno.
    expect(l("ENTRADA", "EQUIPAMENTO")).toBe(false);
    expect(l("SAIDA", "OUTRA_RECEITA")).toBe(false);
  });

  it("ENTRADA-CA-01: os tipos de entrada são outra receita e aporte", () => {
    expect(ehTipoDeEntrada("OUTRA_RECEITA")).toBe(true);
    expect(ehTipoDeEntrada("APORTE")).toBe(true);
    expect(ehTipoDeEntrada("MENSALIDADE")).toBe(false);
  });
});
