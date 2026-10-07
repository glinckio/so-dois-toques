import { describe, expect, it } from "vitest";
import {
  datasDoPeriodo,
  mesesAte,
  ocupacaoPorTurno,
  periodoDoMes,
  porcentagem,
  problemaDePeriodo,
  resumoFinanceiro,
  turnoDaHora,
  type LancamentoContabil,
} from "./regras.js";

const entrada = (categoria: string, valor: number, categoriaOriginal?: string) =>
  ({ tipo: "ENTRADA", categoria, valorCentavos: valor, categoriaOriginal }) as LancamentoContabil;
const saida = (categoria: string, valor: number, categoriaOriginal?: string) =>
  ({ tipo: "SAIDA", categoria, valorCentavos: valor, categoriaOriginal }) as LancamentoContabil;

describe("CONT-CA-01 e CONT-CA-02: receitas, despesas e conferência", () => {
  const lancamentos = [
    entrada("MENSALIDADE", 15000),
    entrada("MENSALIDADE", 15000),
    saida("ESTORNO", 15000, "MENSALIDADE"),
    entrada("ALUGUEL_QUADRA", 16000),
    entrada("VENDA", 2000),
    entrada("RECEITA_AVULSA", 500),
    saida("COMPRA_ESTOQUE", 1200),
    entrada("ESTORNO", 200, "COMPRA_ESTOQUE"),
    saida("QUADRA_PARCEIRA", 8000),
    saida("DESPESA", 300),
    entrada("SUPRIMENTO", 5000),
    saida("SANGRIA", 2000),
    entrada("ESTORNO", 2000, "SANGRIA"),
  ];

  it("soma por origem e tipo, descontando estornos da origem do original", () => {
    const r = resumoFinanceiro(lancamentos);
    expect(r.receitas).toEqual({ AULAS: 15000, LOCACAO: 16000, LANCHONETE: 2000, OUTRAS: 500 });
    expect(r.despesas).toEqual({ ESTOQUE: 1000, QUADRAS_PARCEIRAS: 8000, OUTRAS: 300 });
    expect(r.totalReceitas).toBe(33500);
    expect(r.totalDespesas).toBe(9300);
    expect(r.resultado).toBe(24200);
    expect(r.margemPercentual).toBe(72.2);
  });

  it("deixa suprimento e sangria fora do resultado e confere com o Caixa", () => {
    const r = resumoFinanceiro(lancamentos);
    expect(r.gaveta).toBe(5000);
    expect(r.entradas).toBe(55700);
    expect(r.saidas).toBe(26500);
    expect(r.resultado + r.gaveta).toBe(r.entradas - r.saidas);
    expect(r.confere).toBe(true);
  });

  it("guarda categoria desconhecida à parte, sem perder a conferência", () => {
    const r = resumoFinanceiro([entrada("NOVA", 100), saida("ESTORNO", 50, null as never)]);
    expect(r.naoClassificado).toBe(50);
    expect(r.totalReceitas).toBe(0);
    expect(r.confere).toBe(true);
  });

  it("sem receita não há margem", () => {
    expect(resumoFinanceiro([saida("DESPESA", 100)]).margemPercentual).toBeNull();
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

describe("CONT-CA-06: ocupação por turno", () => {
  it("separa os turnos pelas horas", () => {
    expect([6, 11, 12, 17, 18, 23].map(turnoDaHora)).toEqual([
      "MANHA",
      "MANHA",
      "TARDE",
      "TARDE",
      "NOITE",
      "NOITE",
    ]);
  });

  it("calcula horas abertas pelas faixas, menos bloqueios, e a ocupação", () => {
    // 2026-10-05 é segunda (1) e 2026-10-06 é terça (2).
    const faixas = [
      { diaSemana: 1, horaInicio: 8, horaFim: 22 },
      { diaSemana: 2, horaInicio: 17, horaFim: 22 },
    ];
    const ocupacao = ocupacaoPorTurno(["q1", "q2"], ["2026-10-05", "2026-10-06"], faixas, [
      { quadraId: "q1", data: "2026-10-05", tipo: "RESERVA", horaInicio: 18, horaFim: 20 },
      { quadraId: "q1", data: "2026-10-06", tipo: "RESERVA", horaInicio: 19, horaFim: 20 },
      { quadraId: "q1", data: "2026-10-05", tipo: "BLOQUEIO", horaInicio: 8, horaFim: 10 },
      { quadraId: "q2", data: "2026-10-05", tipo: "RESERVA", horaInicio: 9, horaFim: 10 },
    ]);
    expect(ocupacao.get("q1")).toEqual({
      MANHA: { abertas: 4, bloqueadas: 2, reservadas: 0, ocupacaoPercentual: 0 },
      TARDE: { abertas: 7, bloqueadas: 0, reservadas: 0, ocupacaoPercentual: 0 },
      NOITE: { abertas: 8, bloqueadas: 0, reservadas: 3, ocupacaoPercentual: 37.5 },
    });
    expect(ocupacao.get("q2")?.MANHA).toEqual({
      abertas: 4,
      bloqueadas: 0,
      reservadas: 1,
      ocupacaoPercentual: 25,
    });
  });

  it("sem horas disponíveis não há ocupação", () => {
    const ocupacao = ocupacaoPorTurno(["q1"], ["2026-10-05"], [], []);
    expect(ocupacao.get("q1")?.NOITE.ocupacaoPercentual).toBeNull();
  });
});
