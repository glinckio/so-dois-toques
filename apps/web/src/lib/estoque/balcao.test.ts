import { describe, expect, it } from "vitest";
import {
  lerQuantidade,
  ordemDoBalcao,
  quantidadeDepoisDoToque,
  quantidadesDosValores,
  resumoDoBalcao,
  textoDaQuantidade,
} from "./balcao";

const AGUA = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Água",
  precoCentavos: 500,
  saldo: 2,
};
const SUCO = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Suco",
  precoCentavos: 850,
  saldo: 10,
};
const PICOLE = {
  id: "33333333-3333-4333-8333-333333333333",
  nome: "Picolé",
  precoCentavos: 400,
  saldo: 0,
};

describe("VIVO-CA-07: botões + e − do balcão", () => {
  it("VIVO-CA-07: o + sobe de um em um e para no saldo", () => {
    expect(quantidadeDepoisDoToque("", 1, 2)).toBe(1);
    expect(quantidadeDepoisDoToque("1", 1, 2)).toBe(2);
    expect(quantidadeDepoisDoToque("2", 1, 2)).toBe(2);
    expect(quantidadeDepoisDoToque("", 1, 0)).toBe(0);
  });

  it("VIVO-CA-07: o − desce de um em um e não fica abaixo de zero", () => {
    expect(quantidadeDepoisDoToque("2", -1, 2)).toBe(1);
    expect(quantidadeDepoisDoToque("1", -1, 2)).toBe(0);
    expect(quantidadeDepoisDoToque("", -1, 2)).toBe(0);
    expect(quantidadeDepoisDoToque("0", -1, 2)).toBe(0);
  });

  it("VIVO-CA-07: quantidade digitada acima do saldo volta para dentro dele no toque", () => {
    expect(quantidadeDepoisDoToque("9", -1, 2)).toBe(2);
    expect(quantidadeDepoisDoToque("9", 1, 2)).toBe(2);
    expect(quantidadeDepoisDoToque("abc", 1, 2)).toBe(1);
    expect(quantidadeDepoisDoToque("1", 1, -3)).toBe(0);
  });

  it("VIVO-CA-07: os botões se desabilitam nos limites", () => {
    const { linhas } = resumoDoBalcao([AGUA, PICOLE], { [AGUA.id]: "2" });
    expect(linhas[0]).toMatchObject({ quantidade: 2, podeMais: false, podeMenos: true });
    expect(linhas[1]).toMatchObject({ quantidade: 0, podeMais: false, podeMenos: false });
    const vazio = resumoDoBalcao([AGUA], {}).linhas[0];
    expect(vazio).toMatchObject({ podeMais: true, podeMenos: false, acimaDoSaldo: false });
  });
});

describe("VIVO-CA-07: o total acompanha as quantidades", () => {
  it("VIVO-CA-07: soma preço × quantidade de cada produto escolhido", () => {
    const resumo = resumoDoBalcao([AGUA, SUCO, PICOLE], { [AGUA.id]: "2", [SUCO.id]: "3" });
    expect(resumo.totalCentavos).toBe(2 * 500 + 3 * 850);
    expect(resumo.unidades).toBe(5);
    expect(resumo.escolhidos.map((l) => [l.nome, l.subtotalCentavos])).toEqual([
      ["Água", 1000],
      ["Suco", 2550],
    ]);
    expect(resumo.valido).toBe(true);
  });

  it("VIVO-CA-07: o total segue a quantidade digitada, mesmo acima do saldo", () => {
    const resumo = resumoDoBalcao([AGUA], { [AGUA.id]: "7" });
    expect(resumo.totalCentavos).toBe(3500);
    expect(resumo.linhas[0]).toMatchObject({ acimaDoSaldo: true, podeMais: false });
  });

  it("VIVO-CA-07: sem nada escolhido, ou com quantidade que não é inteira, o total é zero", () => {
    expect(resumoDoBalcao([AGUA, SUCO], {}).totalCentavos).toBe(0);
    const quebrado = resumoDoBalcao([AGUA, SUCO], { [AGUA.id]: "1,5", [SUCO.id]: "1" });
    expect(quebrado.totalCentavos).toBe(0);
    expect(quebrado.valido).toBe(false);
  });
});

describe("campos do balcão", () => {
  it("lê o campo de quantidade", () => {
    expect(lerQuantidade("3")).toBe(3);
    expect(lerQuantidade(" 4 ")).toBe(4);
    expect(lerQuantidade("")).toBe(0);
    expect(lerQuantidade(undefined)).toBe(0);
    expect(lerQuantidade("-2")).toBe(0);
    expect(lerQuantidade("1.5")).toBe(0);
  });

  it("zero deixa o campo vazio", () => {
    expect(textoDaQuantidade(0)).toBe("");
    expect(textoDaQuantidade(3)).toBe("3");
  });

  it("volta às quantidades devolvidas pela ação", () => {
    expect(quantidadesDosValores({ [`qtd-${AGUA.id}`]: "7", forma: "PIX" })).toEqual({
      [AGUA.id]: "7",
    });
    expect(quantidadesDosValores(undefined)).toEqual({});
  });

  it("põe os esgotados no fim, sem mudar a ordem dos outros", () => {
    expect(ordemDoBalcao([PICOLE, SUCO, AGUA]).map((p) => p.nome)).toEqual([
      "Suco",
      "Água",
      "Picolé",
    ]);
  });
});
