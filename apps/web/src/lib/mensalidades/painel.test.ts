import { describe, expect, it } from "vitest";
import { fracaoRecebida, linkDoWhatsapp, nivelDoAtraso, TOM_DA_SITUACAO } from "./painel";

describe("MENS-CA-15: totais do mês", () => {
  it("mede o recebido contra o previsto, sem passar de 100%", () => {
    expect(fracaoRecebida({ previsto: 40000, recebido: 10000 })).toBe(0.25);
    expect(fracaoRecebida({ previsto: 10000, recebido: 12000 })).toBe(1);
    expect(fracaoRecebida({ previsto: 0, recebido: 0 })).toBe(0);
  });

  it("dá um tom diferente a cada situação", () => {
    expect(TOM_DA_SITUACAO).toEqual({
      EM_ABERTO: "ouro",
      ATRASADA: "perigo",
      PAGA: "sucesso",
      CANCELADA: "neutro",
    });
  });
});

describe("MENS-CA-14: inadimplentes", () => {
  it("enche a barra de atraso até 90 dias e fica vermelha a partir de 30", () => {
    expect(nivelDoAtraso(1)).toEqual({ fracao: 1 / 90, tom: "ouro", rotulo: "1 dia de atraso" });
    expect(nivelDoAtraso(45)).toEqual({ fracao: 0.5, tom: "perigo", rotulo: "45 dias de atraso" });
    expect(nivelDoAtraso(200).fracao).toBe(1);
    expect(nivelDoAtraso(-3)).toEqual({ fracao: 0, tom: "ouro", rotulo: "0 dias de atraso" });
  });

  it("monta o atalho de WhatsApp com o código do Brasil", () => {
    expect(linkDoWhatsapp("21998765432")).toBe("https://wa.me/5521998765432");
    expect(linkDoWhatsapp("(51) 3456-7890")).toBe("https://wa.me/555134567890");
    expect(linkDoWhatsapp("98765432")).toBeNull();
    expect(linkDoWhatsapp("")).toBeNull();
    expect(linkDoWhatsapp(null)).toBeNull();
  });
});
