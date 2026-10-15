import { describe, expect, it } from "vitest";
import {
  aulasDoDia,
  datasComAula,
  datasDaSerie,
  datasDeBloqueioSobreHorarios,
  descreverHorario,
  inicioDaHora,
  problemaDeData,
  somarDias,
  type TurmaNaAgenda,
} from "./regras.js";

// 2026-10-05 é segunda (1) e 2026-10-06 é terça (2).
const turma = (id: string, desde: string, ate: string | null, ...horarios: number[][]) =>
  ({
    id,
    nome: `Turma ${id}`,
    desde,
    ate,
    horarios: horarios.map(([diaSemana, inicio, fim]) => ({ diaSemana, inicio, fim })),
  }) as TurmaNaAgenda;

describe("FOCO-CA-05: aulas do dia na grade", () => {
  const turmas = [
    turma("a", "2026-10-01", null, [1, 19 * 60, 20 * 60], [3, 19 * 60, 20 * 60]),
    turma("b", "2026-10-01", null, [1, 7 * 60, 8 * 60 + 30]),
    turma("c", "2026-10-06", null, [1, 10 * 60, 11 * 60]),
    turma("d", "2026-09-01", "2026-10-05", [1, 12 * 60, 13 * 60]),
  ];

  it("mostra as aulas do dia da semana, em ordem, só entre o início e o encerramento", () => {
    expect(aulasDoDia(turmas, "2026-10-05")).toEqual([
      { turmaId: "b", nome: "Turma b", inicio: 420, fim: 510 },
      { turmaId: "a", nome: "Turma a", inicio: 1140, fim: 1200 },
    ]);
    expect(aulasDoDia(turmas, "2026-10-12").map((a) => a.turmaId)).toEqual(["b", "c", "a"]);
    expect(aulasDoDia(turmas, "2026-09-28").map((a) => a.turmaId)).toEqual(["d"]);
    expect(aulasDoDia(turmas, "2026-10-06")).toEqual([]);
  });
});

describe("FOCO-CA-06: bloqueio e aula não dividem a quadra", () => {
  const turmas = [turma("a", "2026-10-01", null, [1, 19 * 60, 20 * 60 + 30])];

  it("acha as datas em que o bloqueio cai sobre aula", () => {
    const segundas = ["2026-10-05", "2026-10-12"];
    expect(datasComAula(segundas, 20, 22, turmas)).toEqual(segundas);
    expect(datasComAula(segundas, 21, 22, turmas)).toEqual([]);
    expect(datasComAula(segundas, 18, 19, turmas)).toEqual([]);
    expect(datasComAula(["2026-10-06"], 19, 20, turmas)).toEqual([]);
  });

  it("acha os bloqueios que caem sobre os horários de uma turma", () => {
    const bloqueios = [
      { data: "2026-10-12", horaInicio: 18, horaFim: 20 },
      { data: "2026-10-05", horaInicio: 19, horaFim: 20 },
      { data: "2026-10-05", horaInicio: 20, horaFim: 21 },
      { data: "2026-10-06", horaInicio: 19, horaFim: 20 },
      { data: "2026-10-19", horaInicio: 17, horaFim: 19 },
    ];
    expect(
      datasDeBloqueioSobreHorarios([{ diaSemana: 1, inicio: 1140, fim: 1200 }], bloqueios),
    ).toEqual(["2026-10-05", "2026-10-12"]);
  });
});

describe("FOCO-CA-06: datas e horários do bloqueio", () => {
  it("calcula o início em São Paulo (UTC−3)", () => {
    expect(inicioDaHora("2026-10-07", 19).toISOString()).toBe("2026-10-07T22:00:00.000Z");
    expect(inicioDaHora("2026-10-07", 23).toISOString()).toBe("2026-10-08T02:00:00.000Z");
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("recusa horário começado e bloqueio longe demais", () => {
    const agora = new Date("2026-10-07T13:30:00.000Z"); // 10h30 em São Paulo
    expect(problemaDeData("2026-10-07", 10, "2026-10-07", agora)).toBe("JA_COMECOU");
    expect(problemaDeData("2026-10-06", 20, "2026-10-07", agora)).toBe("JA_COMECOU");
    expect(problemaDeData("2026-10-07", 11, "2026-10-07", agora)).toBeNull();
    expect(problemaDeData("2027-04-05", 8, "2026-10-07", agora)).toBeNull();
    expect(problemaDeData("2027-04-06", 8, "2026-10-07", agora)).toBe("MUITO_LONGE");
  });

  it("descreve o horário", () => {
    expect(descreverHorario("2026-10-07", 19, 21)).toBe("07/10 das 19h às 21h");
  });

  it("gera as datas semanais do dia da semana entre início e fim", () => {
    expect(datasDaSerie("2026-10-06", "2026-10-27", 2)).toEqual([
      "2026-10-06",
      "2026-10-13",
      "2026-10-20",
      "2026-10-27",
    ]);
    expect(datasDaSerie("2026-10-07", "2026-10-21", 2)).toEqual(["2026-10-13", "2026-10-20"]);
    expect(datasDaSerie("2026-10-20", "2026-10-06", 2)).toEqual([]);
    expect(datasDaSerie("2026-02-30", "2026-03-30", 2)).toEqual([]);
  });
});
