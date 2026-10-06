import {
  assinaturaValeEm,
  competenciaAtual,
  competenciaDe,
  competenciaValida,
  diasDeAtraso,
  formatarReais,
  nomeDoMes,
  primeiroDia,
  proximaCompetencia,
  resumoDoCaixa,
  situacaoEm,
  valorDaMensalidade,
  vencimentoEm,
} from "./regras.js";

describe("competências", () => {
  it("valida o formato AAAA-MM e o mês", () => {
    expect(competenciaValida("2026-10")).toBe(true);
    expect(competenciaValida("2026-13")).toBe(false);
    expect(competenciaValida("2026-00")).toBe(false);
    expect(competenciaValida("26-10")).toBe(false);
    expect(competenciaValida("1999-12")).toBe(false);
    expect(competenciaValida("2026-10-01")).toBe(false);
  });

  it("MENS-CA-07: o mês corrente é o de São Paulo, não o de UTC", () => {
    // 01/11 às 01:00 em UTC ainda é 31/10 em São Paulo.
    expect(competenciaAtual(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10");
    expect(competenciaAtual(new Date("2026-11-01T04:00:00Z"))).toBe("2026-11");
  });

  it("calcula mês, primeiro dia e próximo mês", () => {
    expect(competenciaDe("2026-10-31")).toBe("2026-10");
    expect(primeiroDia("2026-10")).toBe("2026-10-01");
    expect(proximaCompetencia("2026-10")).toBe("2026-11");
    expect(proximaCompetencia("2026-12")).toBe("2027-01");
  });
});

describe("valores e vencimento", () => {
  it("MENS-CA-05: vencimento no dia escolhido e valor do plano menos desconto", () => {
    expect(vencimentoEm("2026-02", 5)).toBe("2026-02-05");
    expect(vencimentoEm("2026-02", 28)).toBe("2026-02-28");
    expect(valorDaMensalidade(15000, 0)).toBe(15000);
    expect(valorDaMensalidade(15000, 2500)).toBe(12500);
  });

  it("MENS-CA-02: desconto negativo, igual ou maior que o plano é recusado", () => {
    expect(valorDaMensalidade(15000, -1)).toBeNull();
    expect(valorDaMensalidade(15000, 15000)).toBeNull();
    expect(valorDaMensalidade(15000, 0.5)).toBeNull();
  });

  it("MENS-CA-03: a assinatura vale do mês de início até o mês anterior ao fim", () => {
    const a = { inicio: "2026-10-01", fim: "2027-01-01" };
    expect(assinaturaValeEm(a, "2026-09")).toBe(false);
    expect(assinaturaValeEm(a, "2026-10")).toBe(true);
    expect(assinaturaValeEm(a, "2026-12")).toBe(true);
    expect(assinaturaValeEm(a, "2027-01")).toBe(false);
    expect(assinaturaValeEm({ inicio: "2026-10-01", fim: null }, "2030-05")).toBe(true);
  });
});

describe("situação", () => {
  it("MENS-CA-08: em aberto até o vencimento, atrasada a partir do dia seguinte", () => {
    const m = { situacao: "ABERTA" as const, vencimento: "2026-10-10" };
    expect(situacaoEm(m, "2026-10-09")).toBe("EM_ABERTO");
    expect(situacaoEm(m, "2026-10-10")).toBe("EM_ABERTO");
    expect(situacaoEm(m, "2026-10-11")).toBe("ATRASADA");
    expect(situacaoEm({ ...m, situacao: "PAGA" }, "2026-12-01")).toBe("PAGA");
    expect(situacaoEm({ ...m, situacao: "CANCELADA" }, "2026-12-01")).toBe("CANCELADA");
  });

  it("MENS-CA-14: dias de atraso contam dias corridos depois do vencimento", () => {
    expect(diasDeAtraso("2026-10-10", "2026-10-10")).toBe(0);
    expect(diasDeAtraso("2026-10-10", "2026-10-11")).toBe(1);
    expect(diasDeAtraso("2026-10-10", "2026-11-10")).toBe(31);
    expect(diasDeAtraso("2026-10-10", "2026-10-01")).toBe(0);
  });
});

describe("Caixa", () => {
  it("MENS-CA-17: soma entradas, saídas e saldo por forma de pagamento", () => {
    const resumo = resumoDoCaixa([
      { tipo: "ENTRADA", forma: "PIX", valorCentavos: 15000 },
      { tipo: "ENTRADA", forma: "DINHEIRO", valorCentavos: 12000 },
      { tipo: "ENTRADA", forma: "PIX", valorCentavos: 10000 },
      { tipo: "SAIDA", forma: "PIX", valorCentavos: 10000 },
    ]);
    expect(resumo.entradas).toBe(37000);
    expect(resumo.saidas).toBe(10000);
    expect(resumo.saldo).toBe(27000);
    expect(resumo.porForma.PIX).toEqual({ entradas: 25000, saidas: 10000, saldo: 15000 });
    expect(resumo.porForma.DINHEIRO.saldo).toBe(12000);
    expect(resumo.porForma.CARTAO_CREDITO.saldo).toBe(0);
  });

  it("formata reais e nome do mês em português", () => {
    expect(formatarReais(123456)).toBe("R$ 1.234,56");
    expect(formatarReais(5)).toBe("R$ 0,05");
    expect(nomeDoMes("2026-03")).toBe("março de 2026");
  });
});
