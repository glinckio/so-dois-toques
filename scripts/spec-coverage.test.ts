import { describe, expect, it } from "vitest";
import { extractCriteria, extractStatus, findUncoveredCriteria } from "./spec-coverage";

const spec = `
## Critérios de aceite
- **AULAS-CA-01**: aluno é cadastrado
- **AULAS-CA-02** [manual]: revisão visual
| AULAS-CA-03 | turma cheia recusa aluno |
Texto corrido citando AULAS-CA-09 não é critério.
`;

describe("extractCriteria", () => {
  it("FUND-CA-05: lê critérios de listas e tabelas, marcando os manuais", () => {
    expect(extractCriteria(spec)).toEqual([
      { id: "AULAS-CA-01", manual: false },
      { id: "AULAS-CA-02", manual: true },
      { id: "AULAS-CA-03", manual: false },
    ]);
  });
});

describe("findUncoveredCriteria", () => {
  it("FUND-CA-05: aponta critérios automatizáveis sem teste", () => {
    const criteria = extractCriteria(spec);
    expect(findUncoveredCriteria(criteria, ['it("AULAS-CA-01: cadastra")'])).toEqual([
      "AULAS-CA-03",
    ]);
  });

  it("FUND-CA-05: passa quando todos estão cobertos", () => {
    const criteria = extractCriteria(spec);
    expect(findUncoveredCriteria(criteria, ["AULAS-CA-01", "AULAS-CA-03"])).toEqual([]);
  });
});

describe("extractStatus", () => {
  it("FUND-CA-05: lê o status da spec", () => {
    expect(extractStatus("# Etapa\n\n**Status:** rascunho\n")).toBe("rascunho");
    expect(extractStatus("Status: aprovada")).toBe("aprovada");
    expect(extractStatus("**Status:** Implementada")).toBe("implementada");
  });

  it("FUND-CA-05: spec sem status é tratada como implementada", () => {
    expect(extractStatus("# Etapa sem status")).toBe("implementada");
  });
});
