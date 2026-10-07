import { describe, expect, it } from "vitest";
import { escalaDoEixo, mesCurto, minigrafico, reaisCurto } from "./escala";

describe("escalaDoEixo", () => {
  it("VIS-CA-04: arredonda o teto para um valor redondo", () => {
    expect(escalaDoEixo(830_000)).toEqual({
      teto: 1_000_000,
      passos: [0, 250_000, 500_000, 750_000, 1_000_000],
    });
    expect(escalaDoEixo(12_000).teto).toBe(15_000);
    expect(escalaDoEixo(4).passos).toEqual([0, 1, 2, 3, 4]);
  });

  it("sem valores, usa um eixo mínimo", () => {
    expect(escalaDoEixo(0)).toEqual({ teto: 1, passos: [0, 1] });
    expect(escalaDoEixo(Number.NaN)).toEqual({ teto: 1, passos: [0, 1] });
  });
});

describe("rótulos", () => {
  it("VIS-CA-04: dinheiro curto para o eixo e mês abreviado", () => {
    expect(reaisCurto(0)).toBe("R$ 0");
    expect(reaisCurto(80_000)).toBe("R$ 800");
    expect(reaisCurto(150_000)).toBe("R$ 1,5 mil");
    expect(reaisCurto(1_200_000)).toBe("R$ 12 mil");
    expect(mesCurto("2026-10")).toBe("out");
    expect(mesCurto("2026-01")).toBe("jan");
  });
});

describe("minigráfico", () => {
  it("VIVO-CA-12: a linha vai do primeiro ao último valor, com folga", () => {
    const m = minigrafico([0, 50, 100], 100, 40)!;
    expect(m.linha).toBe("M0,36 L50,20 L100,4");
    expect(m.area).toBe("M0,36 L50,20 L100,4 L100,40 L0,40 Z");
    expect(m.ultimo).toEqual({ x: 100, y: 4 });
  });

  it("valores iguais ficam no meio; um valor só não vira linha", () => {
    expect(minigrafico([7, 7], 10, 20)!.linha).toBe("M0,10 L10,10");
    expect(minigrafico([7], 10, 20)).toBeNull();
  });
});
