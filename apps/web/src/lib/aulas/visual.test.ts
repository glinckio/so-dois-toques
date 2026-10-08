import { describe, expect, it } from "vitest";
import { linkDoWhatsapp } from "../mensalidades/painel";
import type { TurmaResumo } from "./tipos";
import {
  aulaDoDia,
  DEGRAUS_DO_NIVEL,
  idadeEm,
  inicialDe,
  porInicial,
  resumoDasTurmas,
  valorPorAula,
} from "./visual";

const turma = (dados: Partial<TurmaResumo>): TurmaResumo => ({
  id: "t",
  nome: "Turma",
  nivel: "INICIANTE",
  vagas: 10,
  ocupadas: 0,
  livres: 10,
  ativa: true,
  inicio: "2026-01-01",
  local: { id: "l", nome: "Arena" },
  professor: { id: "p", nome: "Paula" },
  horarios: [],
  ...dados,
});

describe("cartões das turmas", () => {
  it("AULAS-CA-10: acha a aula da turma no dia da semana", () => {
    const horarios = [
      { diaSemana: 3, inicio: 1140, fim: 1200 },
      { diaSemana: 3, inicio: 420, fim: 480 },
      { diaSemana: 5, inicio: 600, fim: 660 },
    ];
    expect(aulaDoDia(horarios, 3)).toEqual({ diaSemana: 3, inicio: 420, fim: 480 });
    expect(aulaDoDia(horarios, 1)).toBeNull();
    expect(DEGRAUS_DO_NIVEL.AVANCADO).toBe(3);
  });

  it("AULAS-CA-15: resume vagas, turmas cheias e a próxima aula de hoje", () => {
    const turmas = [
      turma({
        id: "a",
        nome: "Manhã",
        vagas: 8,
        ocupadas: 8,
        horarios: [{ diaSemana: 3, inicio: 420, fim: 480 }],
      }),
      turma({
        id: "b",
        nome: "Noite",
        vagas: 12,
        ocupadas: 5,
        horarios: [{ diaSemana: 3, inicio: 1140, fim: 1230 }],
      }),
      turma({ id: "c", nome: "Sábado", vagas: 0, ocupadas: 0 }),
    ];
    const cedo = resumoDasTurmas(turmas, 3, 400);
    expect(cedo).toMatchObject({ turmas: 3, vagas: 20, ocupadas: 13, livres: 7, lotadas: 1 });
    expect(cedo.fracao).toBeCloseTo(0.65);
    expect(cedo.aulasHoje).toBe(2);
    expect(cedo.proxima).toEqual({ id: "a", nome: "Manhã", inicio: 420, fim: 480, agora: false });
    expect(resumoDasTurmas(turmas, 3, 1150).proxima).toMatchObject({ id: "b", agora: true });
    expect(resumoDasTurmas(turmas, 3, 1300).proxima).toBeNull();
    expect(resumoDasTurmas([], 3, 0)).toMatchObject({ vagas: 0, fracao: 0, proxima: null });
  });
});

describe("perfil do aluno", () => {
  it("AULAS-CA-04: monta o link do WhatsApp só com telefone válido", () => {
    expect(linkDoWhatsapp("21998765432")).toBe("https://wa.me/5521998765432");
    expect(linkDoWhatsapp("(21) 3456-7890")).toBe("https://wa.me/552134567890");
    expect(linkDoWhatsapp("123")).toBeNull();
    expect(linkDoWhatsapp("")).toBeNull();
    expect(linkDoWhatsapp(null)).toBeNull();
  });

  it("calcula a idade completa na data", () => {
    expect(idadeEm("1995-03-20", "2026-10-07")).toBe(31);
    expect(idadeEm("2010-10-07", "2026-10-07")).toBe(16);
    expect(idadeEm("2010-10-08", "2026-10-07")).toBe(15);
    expect(idadeEm("2010-11-01", "2026-10-07")).toBe(15);
    expect(idadeEm("2030-01-01", "2026-10-07")).toBeNull();
    expect(idadeEm(null, "2026-10-07")).toBeNull();
    expect(idadeEm("1995-03-20", "ontem")).toBeNull();
  });

  it("AULAS-CA-05: agrupa os alunos pela inicial, sem acento", () => {
    expect(inicialDe("Érica")).toBe("E");
    expect(inicialDe(" ana")).toBe("A");
    expect(inicialDe("1º aluno")).toBe("#");
    expect(inicialDe("")).toBe("#");
    const grupos = porInicial([{ nome: "Ana" }, { nome: "Álvaro" }, { nome: "Bruno" }]);
    expect(grupos.map((g) => [g.letra, g.itens.length])).toEqual([
      ["A", 2],
      ["B", 1],
    ]);
  });
});

describe("planos", () => {
  it("MENS-CA-01: estima o valor de cada aula do plano", () => {
    expect(valorPorAula(15050, 2)).toBe(1737);
    expect(valorPorAula(20000, 0)).toBeNull();
  });
});
