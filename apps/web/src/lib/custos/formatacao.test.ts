import { describe, expect, it } from "vitest";
import { formatarHoras, partePaga, proporcoes } from "./formatacao";

describe("CUSTO-CA-02: horas do mês na tela", () => {
  it("mostra minutos como horas", () => {
    expect(formatarHoras(0)).toBe("0h");
    expect(formatarHoras(120)).toBe("2h");
    expect(formatarHoras(90)).toBe("1h30");
    expect(formatarHoras(1505)).toBe("25h05");
  });
});

describe("barras de comparação de custos e resultado", () => {
  it("mede cada valor pelo maior, contando negativos pelo tamanho", () => {
    expect(proporcoes([50, 100, 25])).toEqual([0.5, 1, 0.25]);
    expect(proporcoes([-200, 100])).toEqual([1, 0.5]);
    expect(proporcoes([0, 0])).toEqual([0, 0]);
    expect(proporcoes([])).toEqual([]);
  });

  it("CUSTO-CA-03: mostra quanto do previsto já foi pago", () => {
    expect(partePaga(5000, 10000)).toBe(0.5);
    expect(partePaga(12000, 10000)).toBe(1.2);
    expect(partePaga(-100, 10000)).toBe(0);
    expect(partePaga(5000, null)).toBeNull();
    expect(partePaga(5000, 0)).toBeNull();
  });
});
