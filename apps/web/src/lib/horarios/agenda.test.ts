import { describe, expect, it } from "vitest";
import { agendaDoDia, descreverBloco, LINHAS_DA_AGENDA } from "./agenda";
import type { AulaNaGrade, Grade } from "./tipos";

const aula = (turmaId: string, inicio: number, fim: number, professorId = "p1"): AulaNaGrade => ({
  turmaId,
  nome: `Turma ${turmaId}`,
  nivel: "INICIANTE",
  inicio,
  fim,
  professor: { id: professorId, nome: "Ana" },
  vagas: 8,
  ocupadas: 5,
});

const grade = (extra: Partial<Grade> = {}): Grade => ({
  data: "2026-10-20",
  diaSemana: 2,
  quadra: { id: "q", nome: "Quadra" },
  aulas: [],
  bloqueios: [],
  ...extra,
});

describe("FOCO-CA-05: agenda da quadra na tela", () => {
  it("FOCO-CA-05: aula e bloqueio viram blocos nas linhas de quarto de hora, em ordem", () => {
    const agenda = agendaDoDia(
      grade({
        aulas: [aula("a", 18 * 60 + 30, 19 * 60 + 30)],
        bloqueios: [{ id: "b", horaInicio: 7, horaFim: 9, motivo: "Manutenção", serieId: null }],
      }),
      "2026-10-19",
      600,
    );
    expect(LINHAS_DA_AGENDA).toBe(76);
    expect(agenda.blocos.map((b) => [b.tipo, b.linha, b.linhas])).toEqual([
      ["bloqueio", 9, 8],
      ["aula", 55, 4],
    ]);
    expect(agenda.minutosDeAula).toBe(60);
    expect(agenda.minutosBloqueados).toBe(120);
    expect(agenda.ocupacao).toBeCloseTo(180 / (19 * 60));
  });

  it("FOCO-CA-05: hora inteira sem nada é livre; hora com parte de aula não é", () => {
    const agenda = agendaDoDia(
      grade({ aulas: [aula("a", 18 * 60 + 30, 19 * 60 + 30)] }),
      "2026-10-19",
      600,
    );
    const horas = agenda.livres.map((l) => l.hora);
    expect(horas).toContain(17);
    expect(horas).not.toContain(18);
    expect(horas).not.toContain(19);
    expect(horas).toContain(20);
    expect(agenda.livres).toHaveLength(17);
    expect(agenda.livresParaBloquear).toBe(17);
  });

  it("FOCO-CA-05: hoje marca o agora, o que passou e o que está acontecendo", () => {
    const agenda = agendaDoDia(
      grade({ aulas: [aula("a", 9 * 60, 10 * 60), aula("b", 7 * 60, 8 * 60)] }),
      "2026-10-20",
      9 * 60 + 20,
    );
    expect(agenda.agora).toEqual({ linha: 18 });
    expect(agenda.blocos.map((b) => b.momento)).toEqual(["passou", "agora"]);
    expect(agenda.horas.find((h) => h.hora === 9)).toMatchObject({ agora: true, passou: true });
    expect(agenda.livres.find((l) => l.hora === 5)?.passou).toBe(true);
    expect(agenda.livres.find((l) => l.hora === 12)?.passou).toBe(false);
    // Antes das 5h a quadra ainda não abriu: sem linha do agora.
    expect(agendaDoDia(grade(), "2026-10-20", 4 * 60).agora).toBeNull();
  });

  it("FOCO-CA-08: a aula do professor que está vendo tem cor própria", () => {
    const agenda = agendaDoDia(
      grade({ aulas: [aula("a", 420, 480, "eu"), aula("b", 540, 600, "outro")] }),
      "2026-10-19",
      0,
      "eu",
    );
    expect(agenda.blocos.map((b) => b.situacao)).toEqual(["minha", "aula"]);
  });

  it("FOCO-CA-05: descreve o bloco em texto", () => {
    const [primeiro, segundo] = agendaDoDia(
      grade({
        aulas: [aula("a", 18 * 60 + 30, 19 * 60 + 30)],
        bloqueios: [{ id: "b", horaInicio: 7, horaFim: 9, motivo: "Pintura", serieId: null }],
      }),
      "2026-10-19",
      0,
    ).blocos;
    expect(descreverBloco(primeiro!)).toBe("Bloqueado: Pintura, 07:00 às 09:00");
    expect(descreverBloco(segundo!)).toBe("Aula Turma a, 18:30 às 19:30, com Ana, 5 de 8 alunos");
  });
});
