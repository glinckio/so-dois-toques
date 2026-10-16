import { describe, expect, it } from "vitest";
import {
  NOME_MAXIMO as NOME_DA_API,
  TEXTO_MAXIMO as TEXTO_DA_API,
} from "../../../../api/src/feedback/regras";
import {
  filtroDoPainel,
  formatarMedia,
  NOME_MAXIMO,
  partesDaDistribuicao,
  quantasRespostas,
  TEXTO_MAXIMO,
} from "./painel";

describe("FEED-CA-05: filtros e números do painel", () => {
  it("monta a consulta só com filtros válidos", () => {
    const { filtro, consulta } = filtroDoPainel({
      de: "2026-10-01",
      ate: "2026-10-16",
      turmaId: "0b6f3c2a-1d4e-4f5a-9b8c-7d6e5f4a3b2c",
      nota: "5",
    });
    expect(filtro.nota).toBe(5);
    expect(consulta.toString()).toBe(
      "de=2026-10-01&ate=2026-10-16&turmaId=0b6f3c2a-1d4e-4f5a-9b8c-7d6e5f4a3b2c&nota=5",
    );
  });

  it("descarta período pela metade, turma e nota inválidas", () => {
    const { filtro, consulta } = filtroDoPainel({ de: "2026-10-01", turmaId: "x", nota: "9" });
    expect(filtro).toEqual({ de: undefined, ate: undefined, turmaId: undefined, nota: undefined });
    expect(consulta.toString()).toBe("");
  });

  it("formata média, quantidade e distribuição", () => {
    expect(formatarMedia(4.5)).toBe("4,5");
    expect(formatarMedia(4)).toBe("4,0");
    expect(formatarMedia(null)).toBe("—");
    expect(quantasRespostas(1)).toBe("1 resposta");
    expect(quantasRespostas(0)).toBe("0 respostas");
    expect(partesDaDistribuicao([1, 0, 0, 1, 2])).toEqual([
      { nota: 5, quantidade: 2, porcentagem: 50 },
      { nota: 4, quantidade: 1, porcentagem: 25 },
      { nota: 3, quantidade: 0, porcentagem: 0 },
      { nota: 2, quantidade: 0, porcentagem: 0 },
      { nota: 1, quantidade: 1, porcentagem: 25 },
    ]);
    expect(partesDaDistribuicao([0, 0, 0, 0, 0]).every((p) => p.porcentagem === 0)).toBe(true);
  });

  it("FEED-CA-01: o formulário usa os mesmos limites de texto da API", () => {
    expect({ TEXTO_MAXIMO, NOME_MAXIMO }).toEqual({
      TEXTO_MAXIMO: TEXTO_DA_API,
      NOME_MAXIMO: NOME_DA_API,
    });
  });
});
