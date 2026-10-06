import { describe, expect, it } from "vitest";
import {
  centavosDe,
  competenciaAtual,
  competenciaValida,
  deslocarMes,
  formatarReais,
  nomeDoMes,
  valorParaCampo,
} from "./formatacao";

describe("dinheiro", () => {
  it("MENS-CA-01: converte o valor digitado em centavos inteiros", () => {
    expect(centavosDe("150")).toBe(15000);
    expect(centavosDe("150,5")).toBe(15050);
    expect(centavosDe("150,05")).toBe(15005);
    expect(centavosDe("1.234,56")).toBe(123456);
    expect(centavosDe("R$ 99,90")).toBe(9990);
    expect(centavosDe("0,10")).toBe(10);
  });

  it("MENS-CA-01: recusa o que não é valor em reais", () => {
    for (const texto of ["", "abc", "1,234", "12.34", "-10", "10,", "1.23,00"]) {
      expect(centavosDe(texto), texto).toBeNull();
    }
  });

  it("formata reais para tela e para campo", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
    expect(valorParaCampo(15000)).toBe("150,00");
    expect(valorParaCampo(9990)).toBe("99,90");
  });
});

describe("meses", () => {
  it("valida, nomeia e desloca meses", () => {
    expect(competenciaValida("2026-10")).toBe(true);
    expect(competenciaValida("2026-13")).toBe(false);
    expect(competenciaValida(undefined)).toBe(false);
    expect(nomeDoMes("2026-10")).toBe("outubro de 2026");
    expect(deslocarMes("2026-01", -1)).toBe("2025-12");
    expect(deslocarMes("2026-12", 1)).toBe("2027-01");
  });

  it("MENS-CA-07: o mês corrente é o de São Paulo", () => {
    expect(competenciaAtual(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10");
  });
});
