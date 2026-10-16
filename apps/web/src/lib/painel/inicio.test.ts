import { describe, expect, it } from "vitest";
import { minutoEmSaoPaulo, momentoDe, resumoDasAulas, variacao } from "./inicio";

describe("Início", () => {
  it("VIS-CA-04: variação em relação ao mês anterior", () => {
    expect(variacao(12_000, 10_000)).toBe(20);
    expect(variacao(9_000, 12_000)).toBe(-25);
    expect(variacao(-5_000, -10_000)).toBe(50);
    expect(variacao(10_000, 0)).toBeNull();
  });

  it("VIVO-CA-06: minuto atual em São Paulo e o momento de cada aula", () => {
    expect(minutoEmSaoPaulo(new Date("2026-10-07T17:35:00Z"))).toBe(14 * 60 + 35);
    expect(minutoEmSaoPaulo(new Date("2026-10-08T02:10:00Z"))).toBe(23 * 60 + 10);
    expect(momentoDe(600, 660, 540)).toBe("depois");
    expect(momentoDe(600, 660, 600)).toBe("agora");
    expect(momentoDe(600, 660, 660)).toBe("passou");
  });

  it("FOCO-CA-10: aulas dadas e alunos esperados no dia", () => {
    const aulas = [
      { inicio: 7 * 60, fim: 8 * 60, vagas: 10, ocupadas: 6 },
      { inicio: 19 * 60, fim: 20 * 60, vagas: 8, ocupadas: 8 },
    ];
    expect(resumoDasAulas(aulas, 9 * 60)).toEqual({ total: 2, dadas: 1, alunos: 14, vagas: 18 });
    expect(resumoDasAulas([], 9 * 60)).toEqual({ total: 0, dadas: 0, alunos: 0, vagas: 0 });
  });
});
