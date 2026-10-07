import { describe, expect, it } from "vitest";
import {
  celulasDaQuadra,
  faixaDeHoras,
  horaAgoraEmSaoPaulo,
  horaPassou,
  horasDeFuncionamento,
  rotuloHora,
  somarDias,
  tempoAteInicio,
} from "./formatacao";
import type { ReservaNaGrade } from "./tipos";

const reserva = (horaInicio: number, horaFim: number): ReservaNaGrade => ({
  id: `r${horaInicio}`,
  tipo: "RESERVA",
  horaInicio,
  horaFim,
  clienteNome: "Ana",
  clienteTelefone: null,
  motivo: null,
  valorCentavos: 6000,
  serieId: null,
  pago: false,
});

describe("HOR-CA-02: grade na tela", () => {
  it("lista as horas de funcionamento pelas faixas, sem repetir", () => {
    expect(
      horasDeFuncionamento([
        { horaInicio: 17, horaFim: 19 },
        { horaInicio: 8, horaFim: 10 },
      ]),
    ).toEqual([8, 9, 17, 18]);
    expect(horasDeFuncionamento([])).toEqual([]);
  });

  it("marca cada hora como livre ou ocupada, indicando onde a reserva começa", () => {
    const r = reserva(9, 11);
    expect(celulasDaQuadra([8, 9, 10, 11], [r])).toEqual([
      { hora: 8, tipo: "livre" },
      { hora: 9, tipo: "ocupada", reserva: r, primeira: true },
      { hora: 10, tipo: "ocupada", reserva: r, primeira: false },
      { hora: 11, tipo: "livre" },
    ]);
  });

  it("formata horas e soma dias", () => {
    expect(rotuloHora(7)).toBe("07:00");
    expect(faixaDeHoras(19, 24)).toBe("19:00 às 24:00");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("sabe se a hora de hoje já começou", () => {
    expect(horaPassou("2026-10-07", 10, "2026-10-07", 10)).toBe(true);
    expect(horaPassou("2026-10-07", 11, "2026-10-07", 10)).toBe(false);
    expect(horaPassou("2026-10-06", 23, "2026-10-07", 0)).toBe(true);
    expect(horaPassou("2026-10-08", 0, "2026-10-07", 23)).toBe(false);
    expect(horaAgoraEmSaoPaulo(new Date("2026-10-07T13:30:00Z"))).toBe(10);
    expect(tempoAteInicio("2026-10-07T14:00:00.000Z", new Date("2026-10-07T13:30:00Z"))).toBe(
      30 * 60 * 1000,
    );
  });
});
