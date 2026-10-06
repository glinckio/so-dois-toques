import { describe, expect, it } from "vitest";
import { formatarHoras } from "./formatacao";

describe("CUSTO-CA-02: horas do mês na tela", () => {
  it("mostra minutos como horas", () => {
    expect(formatarHoras(0)).toBe("0h");
    expect(formatarHoras(120)).toBe("2h");
    expect(formatarHoras(90)).toBe("1h30");
    expect(formatarHoras(1505)).toBe("25h05");
  });
});
