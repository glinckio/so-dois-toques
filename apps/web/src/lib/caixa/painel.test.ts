import { describe, expect, it } from "vitest";
import { horaEmSaoPaulo } from "../aulas/formatacao";
import {
  categoriasDoTurno,
  desdeQuando,
  diferencaDoFechamento,
  formasDePagamento,
  percentual,
  previaDoAvulso,
  resultadoDoTurno,
  resumoDosTurnos,
} from "./painel";

describe("VIVO-CA-08: painel do caixa aberto", () => {
  it("mostra só a hora quando o caixa abriu hoje", () => {
    const agora = new Date("2026-10-07T18:00:00Z");
    expect(horaEmSaoPaulo("2026-10-07T10:43:00Z")).toBe("07:43");
    expect(desdeQuando("2026-10-07T10:43:00Z", agora)).toEqual({ texto: "07:43", outroDia: false });
  });

  it("mostra a data quando o caixa ficou aberto de um dia para o outro (em São Paulo)", () => {
    // 01:30 UTC do dia 8 ainda é dia 7 em São Paulo.
    expect(desdeQuando("2026-10-06T21:02:00Z", new Date("2026-10-08T01:30:00Z"))).toEqual({
      texto: "06/10 às 18:02",
      outroDia: true,
    });
    expect(desdeQuando("2026-10-06T21:02:00Z", new Date("2026-10-08T12:00:00Z")).outroDia).toBe(
      true,
    );
  });
});

describe("CAIXA-CA-04: diferença do fechamento enquanto se digita", () => {
  it("pede a contagem e recusa o que não é valor", () => {
    expect(diferencaDoFechamento("  ", 5000)).toEqual({
      situacao: "vazio",
      centavos: 0,
      titulo: "Conte a gaveta",
      detalhe: "O esperado é R$ 50,00.",
    });
    expect(diferencaDoFechamento("12,345", 5000).situacao).toBe("invalido");
  });

  it("verde quando bate, com o valor que sobra ou falta quando não bate", () => {
    expect(diferencaDoFechamento("50", 5000)).toMatchObject({ situacao: "bate", centavos: 0 });
    expect(diferencaDoFechamento("R$ 52,50", 5000)).toMatchObject({
      situacao: "sobra",
      centavos: 250,
      titulo: "Sobram R$ 2,50",
    });
    const falta = diferencaDoFechamento("1,00", 5000);
    expect(falta).toMatchObject({ situacao: "falta", centavos: -4900, titulo: "Faltam R$ 49,00" });
    expect(falta.detalhe).toMatch(/observação/);
  });
});

describe("CAIXA-CA-05: resultado e categorias do turno", () => {
  it("resume a diferença do fechamento", () => {
    expect(resultadoDoTurno(null)).toEqual({ situacao: "aberto", texto: "Em andamento" });
    expect(resultadoDoTurno(0)).toEqual({ situacao: "bateu", texto: "Bateu" });
    expect(resultadoDoTurno(300)).toEqual({ situacao: "sobrou", texto: "Sobrou R$ 3,00" });
    expect(resultadoDoTurno(-4900)).toEqual({ situacao: "faltou", texto: "Faltou R$ 49,00" });
  });

  it("resume a lista de turnos sem contar o turno aberto como fechamento que bateu", () => {
    expect(resumoDosTurnos([])).toBe("Cada abertura do caixa, do troco ao fechamento.");
    expect(resumoDosTurnos([null])).toBe("1 turno · nenhum fechado ainda");
    expect(resumoDosTurnos([null, 0])).toBe("2 turnos · o fechamento bateu");
    expect(resumoDosTurnos([0, 0, null])).toBe("3 turnos · todos os 2 fechamentos bateram");
    expect(resumoDosTurnos([0, -4900, 300])).toBe("3 turnos · 2 com diferença no fechamento");
  });

  it("ordena as categorias pelo movimento e mede cada uma pela maior", () => {
    const linhas = categoriasDoTurno([
      { categoria: "DESPESA", entradas: 0, saidas: 1250 },
      { categoria: "MENSALIDADE", entradas: 5000, saidas: 0 },
      { categoria: "ESTORNO", entradas: 1250, saidas: 1250 },
    ]);
    expect(linhas.map((l) => l.nome)).toEqual(["Mensalidade", "Estorno", "Despesa"]);
    expect(linhas.map((l) => l.fracao)).toEqual([1, 0.5, 0.25]);
    expect(categoriasDoTurno([])).toEqual([]);
    expect(categoriasDoTurno([{ categoria: "X", entradas: 0, saidas: 0 }])[0]!.fracao).toBe(0);
  });
});

describe("MENS-CA-17: formas de pagamento do dia", () => {
  const vazio = { entradas: 0, saidas: 0, saldo: 0 };

  it("lista as quatro formas com a parte de cada uma nas entradas", () => {
    const formas = formasDePagamento({
      PIX: { entradas: 6000, saidas: 0, saldo: 6000 },
      DINHEIRO: { entradas: 2000, saidas: 1250, saldo: 750 },
      CARTAO_DEBITO: vazio,
      CARTAO_CREDITO: { entradas: 2000, saidas: 0, saldo: 2000 },
    });
    expect(formas.map((f) => f.rotulo)).toEqual([
      "Pix",
      "Dinheiro",
      "Cartão de débito",
      "Cartão de crédito",
    ]);
    expect(formas.map((f) => f.fracao)).toEqual([0.6, 0.2, 0, 0.2]);
    expect(formas[1]).toMatchObject({ forma: "DINHEIRO", saidas: 1250, saldo: 750 });
    expect(formas.map((f) => percentual(f.fracao))).toEqual([60, 20, 0, 20]);
  });

  it("sem entradas no dia, todas as partes ficam zeradas", () => {
    const formas = formasDePagamento({
      PIX: vazio,
      DINHEIRO: { entradas: 0, saidas: 500, saldo: -500 },
    } as Parameters<typeof formasDePagamento>[0]);
    expect(formas.map((f) => f.fracao)).toEqual([0, 0, 0, 0]);
    expect(formas[3]).toMatchObject({ entradas: 0, saidas: 0, saldo: 0 });
    expect(percentual(1.4)).toBe(100);
    expect(percentual(-1)).toBe(0);
  });
});

describe("CAIXA-CA-02: prévia do lançamento avulso", () => {
  it("diz se o valor entra ou sai do caixa e por qual forma", () => {
    expect(previaDoAvulso("DESPESA", "12,50", "DINHEIRO")).toEqual({
      tipo: "SAIDA",
      valorCentavos: 1250,
      texto: "Sai do caixa em dinheiro",
      alerta: null,
    });
    expect(previaDoAvulso("RECEITA_AVULSA", "", "PIX")).toEqual({
      tipo: "ENTRADA",
      valorCentavos: null,
      texto: "Entra no caixa em Pix",
      alerta: null,
    });
    expect(previaDoAvulso("SUPRIMENTO", "abc", "")?.texto).toBe("Entra no caixa");
  });

  it("avisa que suprimento e sangria são só em dinheiro e ignora o que não é avulso", () => {
    expect(previaDoAvulso("SANGRIA", "10", "PIX")?.alerta).toBe("Sangria só pode ser em dinheiro.");
    expect(previaDoAvulso("SUPRIMENTO", "10", "CARTAO_DEBITO")?.alerta).toBe(
      "Suprimento só pode ser em dinheiro.",
    );
    expect(previaDoAvulso("MENSALIDADE", "10", "PIX")).toBeNull();
    expect(previaDoAvulso("toString", "10", "PIX")).toBeNull();
  });
});
