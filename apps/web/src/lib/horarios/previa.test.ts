import { describe, expect, it } from "vitest";
import { faixasDoDia, horasAbertasNoDia, nivelDoPreco } from "./precos";
import { previaDoValor, semanasDaSerie } from "./previa";

// 2026-10-20 é uma terça-feira (dia 2).
const faixas = [
  { diaSemana: 2, horaInicio: 17, horaFim: 23, valorHoraCentavos: 10000 },
  { diaSemana: 2, horaInicio: 6, horaFim: 17, valorHoraCentavos: 8000 },
  { diaSemana: 3, horaInicio: 6, horaFim: 23, valorHoraCentavos: 9000 },
];

describe("prévia do valor na nova reserva", () => {
  it("soma o preço de cada hora pela faixa do dia da semana", () => {
    expect(previaDoValor(faixas, "2026-10-20", 16, 2)).toEqual({
      horaInicio: 16,
      horaFim: 18,
      horas: [
        { hora: 16, valorCentavos: 8000 },
        { hora: 17, valorCentavos: 10000 },
      ],
      totalCentavos: 18000,
    });
    expect(previaDoValor(faixas, "2026-10-21", 16, 1)?.totalCentavos).toBe(9000);
  });

  it("avisa quando alguma hora está fora do funcionamento", () => {
    const previa = previaDoValor(faixas, "2026-10-20", 22, 2);
    expect(previa?.horas).toEqual([
      { hora: 22, valorCentavos: 10000 },
      { hora: 23, valorCentavos: null },
    ]);
    expect(previa?.totalCentavos).toBeNull();
    // Domingo sem faixa nenhuma.
    expect(previaDoValor(faixas, "2026-10-18", 10, 1)?.totalCentavos).toBeNull();
  });

  it("sem dia ou hora escolhidos não há prévia", () => {
    expect(previaDoValor(faixas, "", 10, 1)).toBeNull();
    expect(previaDoValor(faixas, "2026-02-30", 10, 1)).toBeNull();
    expect(previaDoValor(faixas, "2026-10-20", Number.NaN, 1)).toBeNull();
    expect(previaDoValor(faixas, "2026-10-20", 24, 1)).toBeNull();
    expect(previaDoValor(faixas, "2026-10-20", 10, 0)).toBeNull();
  });

  it("conta as semanas da reserva fixa, do primeiro ao último dia", () => {
    expect(semanasDaSerie("2026-10-20", "2026-10-20")).toBe(1);
    expect(semanasDaSerie("2026-10-20", "2026-11-02")).toBe(2);
    expect(semanasDaSerie("2026-10-20", "2026-11-03")).toBe(3);
    expect(semanasDaSerie("2026-10-20", "2026-10-19")).toBe(0);
    expect(semanasDaSerie("2026-10-20", "")).toBe(0);
  });
});

describe("faixas de preço na linha do dia", () => {
  it("dá o nível do preço entre os preços cadastrados", () => {
    expect(nivelDoPreco(8000, [8000, 8000])).toBe(0);
    expect(nivelDoPreco(8000, [8000, 9000, 10000])).toBe(0);
    expect(nivelDoPreco(9000, [8000, 9000, 10000])).toBe(1);
    expect(nivelDoPreco(10000, [8000, 9000, 10000])).toBe(2);
  });

  it("separa as faixas do dia pela hora e soma as horas abertas", () => {
    const terca = faixasDoDia(faixas, 2);
    expect(terca.map((f) => f.horaInicio)).toEqual([6, 17]);
    expect(horasAbertasNoDia(terca)).toBe(17);
    expect(faixasDoDia(faixas, 0)).toEqual([]);
  });
});
