import { describe, expect, it } from "vitest";
import { contarPresenca, semanaDaPresenca } from "./presenca";

describe("VIVO-CA-09: contador e anel da presença", () => {
  it("VIVO-CA-09: o contador e o anel acompanham cada marcação", () => {
    const vazia = contarPresenca([undefined, undefined, undefined]);
    expect(vazia).toMatchObject({ total: 3, presentes: 0, ausentes: 0, semMarca: 3 });
    expect(vazia.texto).toBe("0 de 3 presentes");
    expect(vazia.fracaoPresentes).toBe(0);
    expect(vazia.rotulo).toBe("Presença: 0 de 3 presentes, 0 ausentes e 3 sem marcar");

    const umToque = contarPresenca(["presente", undefined, null]);
    expect(umToque.texto).toBe("1 de 3 presentes");
    expect(umToque.fracaoPresentes).toBeCloseTo(1 / 3);
    expect(umToque.semMarca).toBe(2);

    const trocada = contarPresenca(["presente", "ausente", "ausente"]);
    expect(trocada).toMatchObject({ presentes: 1, ausentes: 2, semMarca: 0 });
    expect(trocada.fracaoAusentes).toBeCloseTo(2 / 3);
    expect(trocada.rotulo).toBe("Presença: 1 de 3 presentes, 2 ausentes e 0 sem marcar");

    expect(contarPresenca(["ausente"]).rotulo).toBe(
      "Presença: 0 de 1 presentes, 1 ausente e 0 sem marcar",
    );
  });

  it("VIVO-CA-09: lista sem alunos não divide por zero", () => {
    const nada = contarPresenca([]);
    expect(nada).toMatchObject({ total: 0, fracaoPresentes: 0, fracaoAusentes: 0 });
    expect(nada.texto).toBe("0 de 0 presentes");
  });
});

describe("AULAS-CA-17: faixa de dias da presença", () => {
  // Terças e quintas; turma começou em 01/10/2026 (quinta).
  const horarios = [
    { diaSemana: 2, inicio: 420, fim: 480 },
    { diaSemana: 4, inicio: 420, fim: 480 },
  ];

  it("libera só os dias de aula entre o início da turma e hoje", () => {
    const semana = semanaDaPresenca("2026-10-06", "2026-10-07", horarios, "2026-10-01");
    expect(semana.dias.map((d) => d.data)).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
    expect(semana.dias.filter((d) => d.disponivel).map((d) => d.data)).toEqual(["2026-10-06"]);
    expect(semana.dias.find((d) => d.data === "2026-10-08")).toMatchObject({
      temAula: true,
      disponivel: false,
    });
    expect(semana.dias.find((d) => d.escolhido)?.data).toBe("2026-10-06");
    expect(semana.dias.find((d) => d.hoje)?.data).toBe("2026-10-07");
    expect(semana.ultima).toBe("2026-10-06");
  });

  it("as setas levam à aula da semana vizinha, sem passar do início nem de hoje", () => {
    const atual = semanaDaPresenca("2026-10-06", "2026-10-07", horarios, "2026-10-01");
    expect(atual.anterior).toBe("2026-10-01");
    expect(atual.proxima).toBeNull();

    const passada = semanaDaPresenca("2026-10-01", "2026-10-07", horarios, "2026-10-01");
    expect(passada.anterior).toBeNull();
    expect(passada.proxima).toBe("2026-10-06");

    const antiga = semanaDaPresenca("2026-09-15", "2026-10-20", horarios, "2026-01-01");
    expect(antiga.anterior).toBe("2026-09-10");
    expect(antiga.proxima).toBe("2026-09-24");
  });

  it("sem dia de aula, nada fica liberado", () => {
    const semana = semanaDaPresenca("2026-10-06", "2026-10-07", [], "2026-01-01");
    expect(semana.dias.some((d) => d.disponivel)).toBe(false);
    expect(semana).toMatchObject({ anterior: null, proxima: null, ultima: null });
  });
});
