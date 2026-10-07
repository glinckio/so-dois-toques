import { describe, expect, it } from "vitest";
import {
  conflitosDeFaixa,
  datasDaSerie,
  descreverHorario,
  inicioDaHora,
  limiteDeRetencao,
  problemaDeCancelamento,
  problemaDeData,
  somarDias,
  valorDaReserva,
} from "./regras.js";

const faixa = (diaSemana: number, horaInicio: number, horaFim: number, valor = 8000) => ({
  diaSemana,
  horaInicio,
  horaFim,
  valorHoraCentavos: valor,
});

describe("HOR-CA-01: faixas de preço", () => {
  it("acha sobreposição com faixas existentes do mesmo dia", () => {
    const existentes = [faixa(1, 8, 12), faixa(2, 8, 12)];
    expect(conflitosDeFaixa([faixa(1, 11, 14)], existentes).existentes).toEqual([existentes[0]]);
    expect(conflitosDeFaixa([faixa(1, 12, 14)], existentes).existentes).toEqual([]);
    expect(conflitosDeFaixa([faixa(3, 8, 12)], existentes).existentes).toEqual([]);
  });

  it("acha sobreposição entre as faixas novas", () => {
    expect(conflitosDeFaixa([faixa(1, 8, 12), faixa(1, 10, 13)], []).internas).toBe(true);
    expect(conflitosDeFaixa([faixa(1, 8, 12), faixa(2, 10, 13)], []).internas).toBe(false);
  });
});

describe("HOR-CA-03: valor e data da reserva", () => {
  const dia = [faixa(1, 6, 17, 6000), faixa(1, 17, 23, 9000)];

  it("soma cada hora pela faixa em que cai", () => {
    expect(valorDaReserva(dia, 8, 10)).toBe(12000);
    expect(valorDaReserva(dia, 16, 18)).toBe(15000);
  });

  it("recusa hora fora das faixas", () => {
    expect(valorDaReserva(dia, 22, 24)).toBeNull();
    expect(valorDaReserva(dia, 5, 7)).toBeNull();
  });

  it("calcula o início em São Paulo (UTC−3)", () => {
    expect(inicioDaHora("2026-10-07", 19).toISOString()).toBe("2026-10-07T22:00:00.000Z");
    expect(inicioDaHora("2026-10-07", 23).toISOString()).toBe("2026-10-08T02:00:00.000Z");
  });

  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("recusa horário começado e reserva longe demais", () => {
    const agora = new Date("2026-10-07T13:30:00.000Z"); // 10h30 em São Paulo
    expect(problemaDeData("2026-10-07", 10, "2026-10-07", agora)).toBe("JA_COMECOU");
    expect(problemaDeData("2026-10-06", 20, "2026-10-07", agora)).toBe("JA_COMECOU");
    expect(problemaDeData("2026-10-07", 11, "2026-10-07", agora)).toBeNull();
    expect(problemaDeData("2027-04-05", 8, "2026-10-07", agora)).toBeNull();
    expect(problemaDeData("2027-04-06", 8, "2026-10-07", agora)).toBe("MUITO_LONGE");
  });

  it("descreve o horário sem dado pessoal", () => {
    expect(descreverHorario("2026-10-07", 19, 21)).toBe("07/10 das 19h às 21h");
  });
});

describe("HOR-CA-05: datas da reserva fixa", () => {
  it("gera as datas do dia da semana entre início e fim", () => {
    // 2026-10-06 é terça (2).
    expect(datasDaSerie("2026-10-06", "2026-10-27", 2)).toEqual([
      "2026-10-06",
      "2026-10-13",
      "2026-10-20",
      "2026-10-27",
    ]);
    expect(datasDaSerie("2026-10-07", "2026-10-21", 2)).toEqual(["2026-10-13", "2026-10-20"]);
  });

  it("não gera nada com datas inválidas ou fim antes do início", () => {
    expect(datasDaSerie("2026-10-20", "2026-10-06", 2)).toEqual([]);
    expect(datasDaSerie("2026-02-30", "2026-03-30", 2)).toEqual([]);
  });
});

describe("HOR-CA-08: antecedência do cancelamento", () => {
  const inicio = new Date("2026-10-08T22:00:00.000Z");
  const horas = (h: number) => new Date(inicio.getTime() - h * 60 * 60 * 1000);

  it("atendente cancela com 24 horas ou mais", () => {
    expect(problemaDeCancelamento(inicio, horas(24), false)).toBeNull();
    expect(problemaDeCancelamento(inicio, horas(23), false)).toBe("SO_ADMIN");
  });

  it("administrador cancela até o início; depois ninguém", () => {
    expect(problemaDeCancelamento(inicio, horas(1), true)).toBeNull();
    expect(problemaDeCancelamento(inicio, horas(0), true)).toBe("JA_COMECOU");
    expect(problemaDeCancelamento(inicio, horas(-1), false)).toBe("JA_COMECOU");
  });
});

describe("limiteDeRetencao", () => {
  it("LANC-CA-07: o prazo de guarda do cliente é de 12 meses", () => {
    expect(limiteDeRetencao("2026-10-07")).toBe("2025-10-07");
    expect(limiteDeRetencao("2026-01-15")).toBe("2025-01-15");
    expect(limiteDeRetencao("2026-03-10", 3)).toBe("2025-12-10");
  });

  it("LANC-CA-07: dia inexistente no mês de destino vira o último dia do mês", () => {
    expect(limiteDeRetencao("2028-02-29")).toBe("2027-02-28");
    expect(limiteDeRetencao("2026-07-31", 3)).toBe("2026-04-30");
  });
});
