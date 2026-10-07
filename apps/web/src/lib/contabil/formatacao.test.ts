import { describe, expect, it } from "vitest";
import {
  consultaDoPeriodo,
  csvDosLancamentos,
  descreverPeriodo,
  formatarPorcentagem,
} from "./formatacao";

describe("CONT-CA-03: período na tela", () => {
  it("monta a consulta do mês ou do intervalo e ignora o resto", () => {
    expect(consultaDoPeriodo({})).toBe("");
    expect(consultaDoPeriodo({ competencia: "2026-02" })).toBe("competencia=2026-02");
    expect(consultaDoPeriodo({ competencia: "2026-13" })).toBe("");
    expect(consultaDoPeriodo({ de: "2026-01-01", ate: "2026-03-31", competencia: "2026-02" })).toBe(
      "de=2026-01-01&ate=2026-03-31",
    );
    expect(consultaDoPeriodo({ de: "2026-01-01" })).toBe("");
    expect(consultaDoPeriodo({ de: "x&y=1", ate: "2026-01-01" })).toBe("");
    expect(consultaDoPeriodo({ competencia: ["2026-01", "2026-02"] })).toBe("");
  });

  it("descreve o período e as porcentagens em português", () => {
    expect(descreverPeriodo("2026-02-01", "2026-02-28")).toBe("01/02/2026 a 28/02/2026");
    expect(descreverPeriodo("2026-02-01", "2026-02-01")).toBe("01/02/2026");
    expect(formatarPorcentagem(72.2)).toBe("72,2%");
    expect(formatarPorcentagem(100)).toBe("100%");
    expect(formatarPorcentagem(null)).toBe("—");
  });
});

describe("CONT-CA-09: planilha dos lançamentos", () => {
  it("gera CSV para o Excel em português, com sinal na saída e protegido contra fórmula", () => {
    const csv = csvDosLancamentos([
      {
        data: "2026-10-07",
        tipo: "ENTRADA",
        categoria: "ALUGUEL_QUADRA",
        forma: "PIX",
        valorCentavos: 123456,
        descricao: 'Aluguel: Quadra 1, "noite"',
        estorno: false,
      },
      {
        data: "2026-10-08",
        tipo: "SAIDA",
        categoria: "DESPESA",
        forma: "DINHEIRO",
        valorCentavos: 5,
        descricao: '=HIPERLINK("x")',
        estorno: true,
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    const linhas = csv.slice(1).split("\r\n");
    expect(linhas[0]).toBe('"Data";"Tipo";"Categoria";"Forma";"Valor (R$)";"Descrição";"Estorno"');
    expect(linhas[1]).toBe(
      '"07/10/2026";"Entrada";"Aluguel de quadra";"Pix";1234,56;"Aluguel: Quadra 1, ""noite""";"Não"',
    );
    expect(linhas[2]).toBe(
      '"08/10/2026";"Saída";"Despesa";"Dinheiro";-0,05;"\'=HIPERLINK(""x"")";"Sim"',
    );
    expect(linhas[3]).toBe("");
  });
});
