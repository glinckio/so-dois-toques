import { describe, expect, it } from "vitest";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import type { Grade } from "@/lib/horarios/tipos";
import {
  mapaDoDia,
  minutoEmSaoPaulo,
  momentoDe,
  ocupacaoDoDia,
  proximasReservas,
  reservasDoDia,
  turmasDoDia,
  variacao,
} from "./inicio";

const turma = (nome: string, horarios: TurmaResumo["horarios"], ativa = true): TurmaResumo => ({
  id: nome,
  nome,
  nivel: "INICIANTE",
  vagas: 10,
  ocupadas: 4,
  livres: 6,
  ativa,
  inicio: "2026-01-01",
  local: { id: "l", nome: "Quadra parceira" },
  professor: { id: "p", nome: "Prof" },
  horarios,
});

const reserva = (
  horaInicio: number,
  horaFim: number,
  tipo: "RESERVA" | "BLOQUEIO" = "RESERVA",
) => ({
  id: `${horaInicio}-${tipo}`,
  tipo,
  horaInicio,
  horaFim,
  clienteNome: tipo === "RESERVA" ? "Cliente" : null,
  clienteTelefone: null,
  motivo: null,
  valorCentavos: 8000,
  serieId: null,
  pago: false,
});

describe("Início", () => {
  it("VIS-CA-04: variação em relação ao mês anterior", () => {
    expect(variacao(12_000, 10_000)).toBe(20);
    expect(variacao(9_000, 12_000)).toBe(-25);
    expect(variacao(-5_000, -10_000)).toBe(50);
    expect(variacao(10_000, 0)).toBeNull();
  });

  it("VIS-CA-05: turmas do dia, ativas e pela hora de início", () => {
    const turmas = [
      turma("Noite", [{ diaSemana: 2, inicio: 19 * 60, fim: 20 * 60 }]),
      turma("Manhã", [
        { diaSemana: 2, inicio: 8 * 60, fim: 9 * 60 },
        { diaSemana: 4, inicio: 8 * 60, fim: 9 * 60 },
      ]),
      turma("Encerrada", [{ diaSemana: 2, inicio: 10 * 60, fim: 11 * 60 }], false),
      turma("Outro dia", [{ diaSemana: 3, inicio: 7 * 60, fim: 8 * 60 }]),
    ];
    expect(turmasDoDia(turmas, 2).map((t) => [t.turma.nome, t.inicio])).toEqual([
      ["Manhã", 480],
      ["Noite", 1140],
    ]);
  });

  it("VIS-CA-05: reservas e ocupação do dia sem contar bloqueios", () => {
    const grade: Grade = {
      data: "2026-10-07",
      diaSemana: 3,
      faixas: [{ horaInicio: 8, horaFim: 22, valorHoraCentavos: 8000 }],
      quadras: [
        { id: "1", nome: "Quadra 1", reservas: [reserva(19, 21), reserva(8, 10, "BLOQUEIO")] },
        { id: "2", nome: "Quadra 2", reservas: [reserva(18, 19)] },
      ],
    };
    expect(reservasDoDia(grade).map((r) => [r.quadra, r.horaInicio])).toEqual([
      ["Quadra 2", 18],
      ["Quadra 1", 19],
    ]);
    expect(ocupacaoDoDia(grade)).toEqual({ reservadas: 3, abertas: 28 });
  });

  it("VIVO-CA-06: minuto atual em São Paulo e o momento de cada aula", () => {
    // 17:35 em UTC são 14:35 em São Paulo.
    expect(minutoEmSaoPaulo(new Date("2026-10-07T17:35:00Z"))).toBe(14 * 60 + 35);
    expect(minutoEmSaoPaulo(new Date("2026-10-08T02:59:00Z"))).toBe(23 * 60 + 59);
    expect(momentoDe(600, 660, 590)).toBe("depois");
    expect(momentoDe(600, 660, 600)).toBe("agora");
    expect(momentoDe(600, 660, 660)).toBe("passou");
  });

  it("VIVO-CA-06: mapa do dia com uma faixa por quadra e os blocos no lugar", () => {
    const grade: Grade = {
      data: "2026-10-07",
      diaSemana: 3,
      faixas: [
        { horaInicio: 8, horaFim: 12, valorHoraCentavos: 6000 },
        { horaInicio: 17, horaFim: 22, valorHoraCentavos: 8000 },
      ],
      quadras: [
        { id: "1", nome: "Quadra 1", reservas: [reserva(19, 21), reserva(8, 10, "BLOQUEIO")] },
        { id: "2", nome: "Quadra 2", reservas: [] },
      ],
    };
    const mapa = mapaDoDia(grade)!;
    expect([mapa.inicio, mapa.fim]).toEqual([8, 22]);
    expect(mapa.quadras[0]!.blocos.map((b) => [b.tipo, b.inicio, b.fim, b.rotulo])).toEqual([
      ["BLOQUEIO", 8, 10, "Bloqueado"],
      ["RESERVA", 19, 21, "Cliente"],
    ]);
    expect(mapa.quadras[1]!.blocos).toEqual([]);
    expect(mapaDoDia({ ...grade, faixas: [] })).toBeNull();
  });

  it("VIVO-CA-06: próximas reservas são as que ainda não terminaram", () => {
    const grade: Grade = {
      data: "2026-10-07",
      diaSemana: 3,
      faixas: [{ horaInicio: 8, horaFim: 22, valorHoraCentavos: 8000 }],
      quadras: [{ id: "1", nome: "Quadra 1", reservas: [reserva(9, 10), reserva(18, 20)] }],
    };
    const proximas = proximasReservas(reservasDoDia(grade), 18 * 60 + 30);
    expect(proximas.map((r) => r.horaInicio)).toEqual([18]);
  });
});
