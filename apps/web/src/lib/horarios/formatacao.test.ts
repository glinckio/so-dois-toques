import { describe, expect, it } from "vitest";
import {
  faixaDeHoras,
  faixaDeMinutos,
  horaAgoraEmSaoPaulo,
  horaPassou,
  HORAS_DE_FIM,
  HORAS_DE_INICIO,
  rotuloHora,
  semanasDaSerie,
  somarDias,
  tempoAteInicio,
} from "./formatacao";

describe("FOCO-CA-06: horários do bloqueio na tela", () => {
  it("as horas vão das 05h às 24h", () => {
    expect(HORAS_DE_INICIO[0]).toBe(5);
    expect(HORAS_DE_INICIO.at(-1)).toBe(23);
    expect(HORAS_DE_FIM[0]).toBe(6);
    expect(HORAS_DE_FIM.at(-1)).toBe(24);
  });

  it("escreve horas e minutos", () => {
    expect(rotuloHora(7)).toBe("07:00");
    expect(rotuloHora(24)).toBe("24:00");
    expect(faixaDeHoras(19, 21)).toBe("19:00 às 21:00");
    expect(faixaDeMinutos(18 * 60 + 30, 19 * 60 + 5)).toBe("18:30 às 19:05");
  });

  it("soma dias e conta as semanas do bloqueio semanal", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(semanasDaSerie("2026-10-06", "2026-10-27")).toBe(4);
    expect(semanasDaSerie("2026-10-06", "2026-10-12")).toBe(1);
    expect(semanasDaSerie("2026-10-27", "2026-10-06")).toBe(0);
    expect(semanasDaSerie("", "2026-10-06")).toBe(0);
  });

  it("sabe se a hora já começou em São Paulo", () => {
    expect(horaPassou("2026-10-07", 10, "2026-10-07", 10)).toBe(true);
    expect(horaPassou("2026-10-07", 11, "2026-10-07", 10)).toBe(false);
    expect(horaPassou("2026-10-06", 22, "2026-10-07", 10)).toBe(true);
    expect(horaAgoraEmSaoPaulo(new Date("2026-10-07T13:30:00Z"))).toBe(10);
    expect(tempoAteInicio("2026-10-07T14:00:00Z", new Date("2026-10-07T13:00:00Z"))).toBe(
      3_600_000,
    );
  });
});
