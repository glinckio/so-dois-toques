import { describe, expect, it } from "vitest";
import {
  limiteAtingido,
  mediasMensais,
  mesEmSaoPaulo,
  resumoDasNotas,
  textoOpcional,
} from "./regras.js";

describe("FEED-CA-03: limite de envios por hora", () => {
  it("aceita até cinco envios e recusa o sexto", () => {
    expect(limiteAtingido(4)).toBe(false);
    expect(limiteAtingido(5)).toBe(true);
  });
});

describe("FEED-CA-01: textos opcionais", () => {
  it("vazio ou só espaços vira nulo", () => {
    expect(textoOpcional(undefined)).toBeNull();
    expect(textoOpcional("   \n ")).toBeNull();
  });

  it("tira caracteres de controle e espaços nas pontas, mantendo as quebras de linha", () => {
    expect(textoOpcional("  Ótima\u0000 aula\r\nde sábado \u0007 ")).toBe("Ótima aula\nde sábado");
  });

  it("mantém o texto como foi escrito, inclusive sinais de HTML", () => {
    expect(textoOpcional("<b>aulas</b> nota <3")).toBe("<b>aulas</b> nota <3");
  });
});

describe("FEED-CA-05: resumo das notas", () => {
  it("calcula quantidade, média com uma casa e distribuição", () => {
    expect(resumoDasNotas([5, 4, 4, 1])).toEqual({
      quantidade: 4,
      media: 3.5,
      distribuicao: [1, 0, 0, 2, 1],
    });
    expect(resumoDasNotas([5, 5, 4]).media).toBe(4.7);
  });

  it("sem respostas, a média é nula", () => {
    expect(resumoDasNotas([])).toEqual({
      quantidade: 0,
      media: null,
      distribuicao: [0, 0, 0, 0, 0],
    });
  });

  it("agrupa por mês no fuso de São Paulo", () => {
    // 01/10 às 01:00 em UTC ainda é 30/09 em São Paulo.
    expect(mesEmSaoPaulo(new Date("2026-10-01T01:00:00Z"))).toBe("2026-09");
    const meses = mediasMensais(
      [
        { nota: 5, criadaEm: new Date("2026-10-01T01:00:00Z") },
        { nota: 3, criadaEm: new Date("2026-09-10T15:00:00Z") },
        { nota: 4, criadaEm: new Date("2026-10-05T15:00:00Z") },
        { nota: 1, criadaEm: new Date("2025-01-05T15:00:00Z") },
      ],
      ["2026-09", "2026-10"],
    );
    expect(meses).toEqual([
      { competencia: "2026-09", quantidade: 2, media: 4 },
      { competencia: "2026-10", quantidade: 1, media: 4 },
    ]);
  });
});
