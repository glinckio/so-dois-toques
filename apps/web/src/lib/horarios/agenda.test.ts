import { describe, expect, it } from "vitest";
import { agendaDoDia, situacaoDaReserva, type BlocoDaAgenda } from "./agenda";
import type { Grade, ReservaNaGrade } from "./tipos";

const reserva = (
  id: string,
  horaInicio: number,
  horaFim: number,
  extra: Partial<ReservaNaGrade> = {},
): ReservaNaGrade => ({
  id,
  tipo: "RESERVA",
  horaInicio,
  horaFim,
  clienteNome: "Ana",
  clienteTelefone: null,
  motivo: null,
  valorCentavos: 8000 * (horaFim - horaInicio),
  serieId: null,
  pago: false,
  ...extra,
});

const grade = (
  reservas: ReservaNaGrade[][],
  faixas: Grade["faixas"] = [{ horaInicio: 8, horaFim: 13, valorHoraCentavos: 8000 }],
  data = "2026-10-20",
): Grade => ({
  data,
  diaSemana: 2,
  faixas,
  quadras: reservas.map((r, i) => ({ id: `q${i + 1}`, nome: `Quadra ${i + 1}`, reservas: r })),
});

const blocos = (itens: { tipo: string }[]) =>
  itens.filter((i): i is BlocoDaAgenda => i.tipo === "bloco");

describe("VIVO-CA-06: grade de Horários em blocos", () => {
  it("VIVO-CA-06: uma reserva de várias horas é um único bloco que ocupa as linhas dessas horas", () => {
    const r = reserva("r1", 9, 12);
    const agenda = agendaDoDia(grade([[r], []]), "2026-10-07", 600);
    const [q1, q2] = agenda.colunas;
    expect(agenda.horas.map((h) => [h.hora, h.linha])).toEqual([
      [8, 1],
      [9, 2],
      [10, 3],
      [11, 4],
      [12, 5],
    ]);
    expect(q1!.coluna).toBe(2);
    expect(q2!.coluna).toBe(3);
    expect(q1!.itens).toEqual([
      { tipo: "livre", hora: 8, linha: 1, passou: false },
      {
        tipo: "bloco",
        reserva: r,
        situacao: "a-pagar",
        linha: 2,
        linhas: 3,
        horaInicio: 9,
        horaFim: 12,
        momento: "depois",
      },
      { tipo: "livre", hora: 12, linha: 5, passou: false },
    ]);
    expect(q2!.itens.every((i) => i.tipo === "livre")).toBe(true);
    expect(q2!.livres).toBe(5);
  });

  it("VIVO-CA-06: reservas vizinhas são blocos separados, e hora fechada no meio divide o bloco", () => {
    const a = reserva("a", 8, 10);
    const b = reserva("b", 10, 11, { pago: true });
    const vizinhas = agendaDoDia(grade([[a, b]]), "2026-10-07", 600).colunas[0]!;
    expect(blocos(vizinhas.itens).map((x) => [x.reserva.id, x.linha, x.linhas])).toEqual([
      ["a", 1, 2],
      ["b", 3, 1],
    ]);

    // Faixa mudada depois da reserva: 9h deixou de funcionar e as linhas pulam essa hora.
    const longa = reserva("longa", 8, 11);
    const comBuraco = agendaDoDia(
      grade(
        [[longa]],
        [
          { horaInicio: 8, horaFim: 9, valorHoraCentavos: 8000 },
          { horaInicio: 10, horaFim: 12, valorHoraCentavos: 8000 },
        ],
      ),
      "2026-10-07",
      600,
    ).colunas[0]!;
    expect(
      blocos(comBuraco.itens).map((x) => [x.linha, x.linhas, x.horaInicio, x.horaFim]),
    ).toEqual([
      [1, 1, 8, 9],
      [2, 1, 10, 11],
    ]);
  });

  it("colore o bloco pela situação: pago, a pagar, fixa e bloqueio", () => {
    expect(situacaoDaReserva({ tipo: "RESERVA", serieId: null, pago: true })).toBe("pago");
    expect(situacaoDaReserva({ tipo: "RESERVA", serieId: null, pago: false })).toBe("a-pagar");
    expect(situacaoDaReserva({ tipo: "RESERVA", serieId: "s1", pago: true })).toBe("fixa");
    expect(situacaoDaReserva({ tipo: "BLOQUEIO", serieId: "s1", pago: false })).toBe("bloqueio");
  });

  it("marca a hora atual e apaga as horas que já começaram no dia de hoje", () => {
    const hoje = "2026-10-20";
    const antes = reserva("antes", 8, 9);
    const agora = reserva("agora", 10, 12, { pago: true });
    const depois = reserva("depois", 12, 13);
    // 10:35 em São Paulo.
    const agenda = agendaDoDia(grade([[antes, agora, depois]], undefined, hoje), hoje, 635);
    expect(agenda.agora).toEqual({ linha: 3, quarto: 2 });
    expect(agenda.horas.map((h) => [h.hora, h.passou, h.agora])).toEqual([
      [8, true, false],
      [9, true, false],
      [10, true, true],
      [11, false, false],
      [12, false, false],
    ]);
    const coluna = agenda.colunas[0]!;
    expect(blocos(coluna.itens).map((b) => [b.reserva.id, b.momento])).toEqual([
      ["antes", "passou"],
      ["agora", "agora"],
      ["depois", "depois"],
    ]);
    // 9h livre já começou: não aceita reserva.
    expect(coluna.itens.find((i) => i.tipo === "livre")).toEqual({
      tipo: "livre",
      hora: 9,
      linha: 2,
      passou: true,
    });
    expect(coluna.livres).toBe(0);

    // Fora do funcionamento ou em outro dia, não há linha da hora atual.
    expect(agendaDoDia(grade([[]], undefined, hoje), hoje, 20 * 60).agora).toBeNull();
    const amanha = agendaDoDia(grade([[]], undefined, "2026-10-21"), hoje, 635);
    expect(amanha.agora).toBeNull();
    expect(amanha.horas.some((h) => h.passou)).toBe(false);
    const ontem = agendaDoDia(grade([[antes]], undefined, "2026-10-19"), hoje, 635);
    expect(ontem.horas.every((h) => h.passou)).toBe(true);
    expect(blocos(ontem.colunas[0]!.itens)[0]!.momento).toBe("passou");
  });

  it("soma as horas de cada situação para a legenda e a ocupação para o anel", () => {
    const agenda = agendaDoDia(
      grade([
        [
          reserva("p", 8, 10, { pago: true }),
          reserva("f", 10, 11, { serieId: "s" }),
          reserva("b", 11, 12, { tipo: "BLOQUEIO", clienteNome: null, motivo: "Aula" }),
        ],
        [reserva("a", 12, 13)],
      ]),
      "2026-10-07",
      0,
    );
    expect(agenda.horasPorSituacao).toEqual({
      pago: 2,
      "a-pagar": 1,
      fixa: 1,
      bloqueio: 1,
      livre: 5,
    });
    expect(agenda.reservadas).toBe(4);
    expect(agenda.abertas).toBe(10);
    expect(agenda.livresParaReservar).toBe(5);
  });

  it("dia sem funcionamento não tem linhas", () => {
    const agenda = agendaDoDia(grade([[], []], []), "2026-10-07", 0);
    expect(agenda.horas).toEqual([]);
    expect(agenda.abertas).toBe(0);
    expect(agenda.colunas.map((c) => c.itens)).toEqual([[], []]);
  });
});
