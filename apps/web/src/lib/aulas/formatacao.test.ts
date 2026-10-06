import { describe, expect, it } from "vitest";
import {
  descreverHorarios,
  diaDaSemana,
  formatarData,
  formatarTelefone,
  hojeEmSaoPaulo,
  horaDe,
  minutosDe,
  ultimaAula,
} from "./formatacao";

describe("formatação de Aulas", () => {
  it("AULAS-CA-04: mostra telefone com DDD formatado", () => {
    expect(formatarTelefone("21998765432")).toBe("(21) 99876-5432");
    expect(formatarTelefone("2134567890")).toBe("(21) 3456-7890");
    expect(formatarTelefone("")).toBe("");
    expect(formatarTelefone(null)).toBe("");
    expect(formatarTelefone("123")).toBe("123");
  });

  it("AULAS-CA-10: converte horas e descreve os horários da turma", () => {
    expect(minutosDe("07:30")).toBe(450);
    expect(minutosDe("7:30")).toBeNull();
    expect(horaDe(1110)).toBe("18:30");
    expect(
      descreverHorarios([
        { diaSemana: 3, inicio: 420, fim: 480 },
        { diaSemana: 1, inicio: 420, fim: 480 },
        { diaSemana: 5, inicio: 1080, fim: 1140 },
      ]),
    ).toBe("Seg e Qua, 07:00–08:00 · Sex, 18:00–19:00");
    expect(
      descreverHorarios([
        { diaSemana: 1, inicio: 420, fim: 480 },
        { diaSemana: 2, inicio: 420, fim: 480 },
        { diaSemana: 4, inicio: 420, fim: 480 },
      ]),
    ).toBe("Seg, Ter e Qui, 07:00–08:00");
  });

  it("formata datas e calcula o dia no fuso de São Paulo", () => {
    expect(formatarData("2026-10-06")).toBe("06/10/2026");
    expect(formatarData(null)).toBe("");
    expect(hojeEmSaoPaulo(new Date("2026-10-07T02:00:00Z"))).toBe("2026-10-06");
    expect(diaDaSemana("2026-10-06")).toBe(2);
  });

  it("AULAS-CA-17: a presença abre na última aula até hoje", () => {
    const tercaEQuinta = [
      { diaSemana: 2, inicio: 420, fim: 480 },
      { diaSemana: 4, inicio: 420, fim: 480 },
    ];
    expect(ultimaAula(tercaEQuinta, "2026-10-06")).toBe("2026-10-06");
    expect(ultimaAula(tercaEQuinta, "2026-10-07")).toBe("2026-10-06");
    expect(ultimaAula(tercaEQuinta, "2026-10-09")).toBe("2026-10-08");
    expect(ultimaAula([], "2026-10-06")).toBeNull();
  });
});
