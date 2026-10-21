import { describe, expect, it } from "vitest";
import {
  datasDoPeriodo,
  mesesAte,
  periodoDoMes,
  porcentagem,
  problemaDePeriodo,
  resumoFinanceiro,
  type LancamentoContabil,
} from "./regras.js";

const entrada = (categoria: string, valor: number) =>
  ({ tipo: "ENTRADA", categoria, valorCentavos: valor }) as LancamentoContabil;
const saida = (categoria: string, valor: number) =>
  ({ tipo: "SAIDA", categoria, valorCentavos: valor }) as LancamentoContabil;

describe("FOCO-CA-09: recebido, estornos e conferência", () => {
  it("soma mensalidades recebidas e estornos, e o resultado confere com o livro-razão", () => {
    const r = resumoFinanceiro([
      entrada("MENSALIDADE", 15000),
      entrada("MENSALIDADE", 15000),
      saida("ESTORNO", 15000),
    ]);
    expect(r).toMatchObject({
      recebido: 30000,
      estornos: 15000,
      totalGastos: 0,
      resultado: 15000,
      naoClassificado: 0,
      entradas: 30000,
      saidas: 15000,
      confere: true,
    });
  });

  it("guarda lançamento desconhecido à parte, sem perder a conferência", () => {
    const r = resumoFinanceiro([entrada("NOVA", 100), saida("OUTRA", 30)]);
    expect(r.naoClassificado).toBe(70);
    expect(r.resultado).toBe(0);
    expect(r.confere).toBe(true);
  });

  it("GASTO-CA-08: gastos por tipo descontam os estornos; saldo inicial não é receita", () => {
    const r = resumoFinanceiro([
      entrada("SALDO_INICIAL", 60000),
      entrada("MENSALIDADE", 20000),
      saida("ALUGUEL_MENSAL", 8000),
      saida("LOCACAO_AVULSA", 3000),
      saida("EQUIPAMENTO", 5000),
      entrada("EQUIPAMENTO", 5000),
      saida("INVESTIMENTO", 1000),
      saida("OUTRO_GASTO", 500),
    ]);
    expect(r.recebido).toBe(20000);
    expect(r.saldoInicial).toBe(60000);
    expect(r.gastos).toEqual({
      ALUGUEL_MENSAL: 8000,
      LOCACAO_AVULSA: 3000,
      EQUIPAMENTO: 0,
      INVESTIMENTO: 1000,
      OUTRO_GASTO: 500,
    });
    expect(r.totalGastos).toBe(12500);
    expect(r.resultado).toBe(7500);
    expect(r.naoClassificado).toBe(0);
    expect(r.confere).toBe(true);
  });

  it("ENTRADA-CA-04: outras receitas entram no resultado; aporte fica à parte e confere", () => {
    const r = resumoFinanceiro([
      entrada("MENSALIDADE", 20000),
      entrada("OUTRA_RECEITA", 5000),
      entrada("OUTRA_RECEITA", 1000),
      saida("OUTRA_RECEITA", 1000),
      entrada("APORTE", 30000),
      entrada("APORTE", 2000),
      saida("APORTE", 2000),
      saida("EQUIPAMENTO", 4000),
    ]);
    expect(r.outrasReceitas).toBe(5000);
    expect(r.aportes).toBe(30000);
    expect(r.recebido).toBe(20000);
    expect(r.resultado).toBe(20000 + 5000 - 4000);
    expect(r.naoClassificado).toBe(0);
    expect(r.confere).toBe(true);
    expect(r.entradas - r.saidas).toBe(r.resultado + r.aportes);
  });

  it("porcentagem com uma casa e sem base", () => {
    expect(porcentagem(1, 3)).toBe(33.3);
    expect(porcentagem(1, 0)).toBeNull();
  });
});

describe("CONT-CA-03: período", () => {
  it("aceita até 366 dias e recusa datas ruins ou invertidas", () => {
    expect(problemaDePeriodo({ de: "2026-01-01", ate: "2026-12-31" })).toBeNull();
    expect(problemaDePeriodo({ de: "2024-01-01", ate: "2024-12-31" })).toBeNull();
    expect(problemaDePeriodo({ de: "2026-01-01", ate: "2027-01-01" })).toBeNull();
    expect(problemaDePeriodo({ de: "2026-01-01", ate: "2027-01-02" })).toBe("LONGO");
    expect(problemaDePeriodo({ de: "2026-02-10", ate: "2026-02-01" })).toBe("INVERTIDO");
    expect(problemaDePeriodo({ de: "2026-02-30", ate: "2026-03-01" })).toBe("DATA_INVALIDA");
  });

  it("transforma o mês em período e lista as datas", () => {
    expect(periodoDoMes("2026-02")).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(periodoDoMes("2026-12")).toEqual({ de: "2026-12-01", ate: "2026-12-31" });
    expect(datasDoPeriodo({ de: "2026-02-27", ate: "2026-03-02" })).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });
});

describe("CONT-CA-04: comparativo mensal", () => {
  it("lista os 12 meses que terminam no mês da data", () => {
    const meses = mesesAte("2026-03-15");
    expect(meses).toHaveLength(12);
    expect(meses[0]).toBe("2025-04");
    expect(meses.at(-1)).toBe("2026-03");
    expect(mesesAte("2026-01-31", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});
