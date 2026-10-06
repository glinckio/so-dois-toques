import {
  custoPrevisto,
  matriculaValeNoMes,
  minutosDaTurmaNoMes,
  ratear,
  ratearIgual,
} from "./regras.js";

// Outubro de 2026 começa numa quinta: 4 terças (6, 13, 20, 27) e 5 quintas (1, 8, 15, 22, 29).
const TERCA = 2;
const QUINTA = 4;
const aula = (diaSemana: number, inicio = 18 * 60, fim = 19 * 60) => ({ diaSemana, inicio, fim });

describe("CUSTO-CA-02: horas e custo previsto", () => {
  it("soma as aulas de cada dia da semana no mês", () => {
    const turma = {
      horarios: [aula(TERCA), aula(QUINTA, 18 * 60, 19 * 60 + 30)],
      inicio: "2026-01-01",
      encerradaEm: null,
    };
    expect(minutosDaTurmaNoMes(turma, "2026-10")).toBe(4 * 60 + 5 * 90);
  });

  it("conta a partir do início e até o dia anterior ao encerramento", () => {
    const turma = { horarios: [aula(TERCA)], inicio: "2026-10-13", encerradaEm: "2026-10-27" };
    expect(minutosDaTurmaNoMes(turma, "2026-10")).toBe(2 * 60);
  });

  it("turma que começou depois ou encerrou antes do mês não tem horas", () => {
    expect(
      minutosDaTurmaNoMes(
        { horarios: [aula(TERCA)], inicio: "2026-11-01", encerradaEm: null },
        "2026-10",
      ),
    ).toBe(0);
    expect(
      minutosDaTurmaNoMes(
        { horarios: [aula(TERCA)], inicio: "2026-01-01", encerradaEm: "2026-09-30" },
        "2026-10",
      ),
    ).toBe(0);
  });

  it("considera o tamanho do mês, inclusive fevereiro", () => {
    const todoDia = [0, 1, 2, 3, 4, 5, 6].map((d) => aula(d));
    expect(
      minutosDaTurmaNoMes(
        { horarios: todoDia, inicio: "2020-01-01", encerradaEm: null },
        "2028-02",
      ),
    ).toBe(29 * 60);
    expect(
      minutosDaTurmaNoMes(
        { horarios: todoDia, inicio: "2020-01-01", encerradaEm: null },
        "2026-02",
      ),
    ).toBe(28 * 60);
  });

  it("custo previsto é horas × valor da hora, arredondado ao centavo", () => {
    expect(custoPrevisto(90, 8000)).toBe(12000);
    expect(custoPrevisto(50, 3333)).toBe(2778);
    expect(custoPrevisto(0, 8000)).toBe(0);
  });
});

describe("CUSTO-CA-05: rateio em centavos", () => {
  it("divide na proporção e a soma das partes é o total", () => {
    expect(ratear(10000, [60, 120])).toEqual([3333, 6667]);
    expect(ratear(100, [1, 1, 1])).toEqual([34, 33, 33]);
    const partes = ratear(99_999, [7, 13, 29, 1]) ?? [];
    expect(partes.reduce((a, b) => a + b, 0)).toBe(99_999);
  });

  it("estorno negativo divide igual ao pagamento, com sinal trocado", () => {
    const pagamento = ratear(10001, [3, 5, 7]) ?? [];
    const estorno = ratear(-10001, [3, 5, 7]) ?? [];
    expect(estorno).toEqual(pagamento.map((p) => -p));
  });

  it("sem pesos ou com pesos zero não divide", () => {
    expect(ratear(100, [])).toBeNull();
    expect(ratear(100, [0, 0])).toBeNull();
    expect(ratear(0, [1, 2])).toEqual([0, 0]);
  });

  it("divide em partes iguais", () => {
    expect(ratearIgual(1000, 3)).toEqual([334, 333, 333]);
    expect(ratearIgual(-1000, 3)).toEqual([-334, -333, -333]);
    expect(ratearIgual(1000, 0)).toBeNull();
  });

  it("a matrícula vale no mês quando teve algum dia nele", () => {
    expect(matriculaValeNoMes({ inicio: "2026-09-10", fim: null }, "2026-10")).toBe(true);
    expect(matriculaValeNoMes({ inicio: "2026-10-31", fim: null }, "2026-10")).toBe(true);
    expect(matriculaValeNoMes({ inicio: "2026-11-01", fim: null }, "2026-10")).toBe(false);
    expect(matriculaValeNoMes({ inicio: "2026-09-10", fim: "2026-10-01" }, "2026-10")).toBe(false);
    expect(matriculaValeNoMes({ inicio: "2026-09-10", fim: "2026-10-02" }, "2026-10")).toBe(true);
    expect(matriculaValeNoMes({ inicio: "2026-10-05", fim: "2026-10-05" }, "2026-10")).toBe(false);
  });
});
