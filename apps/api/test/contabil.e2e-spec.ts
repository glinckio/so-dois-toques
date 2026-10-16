import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { periodoDoMes } from "../src/contabil/regras.js";
import { competenciaAtual } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, logado } from "./apoio-aulas.js";
import { criarPlano, mensalidadeNoPassado, mesesAtras } from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());

type Painel = {
  periodo: { de: string; ate: string };
  recebido: number;
  estornos: number;
  resultado: number;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  porForma: Record<string, { entradas: number; saidas: number; saldo: number }>;
  comparativo: { competencia: string; recebido: number; estornos: number; resultado: number }[];
  aReceber: { quantidade: number; valorCentavos: number };
};

describe("Etapa 8 e 12: painel contábil das mensalidades", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
  });

  afterAll(async () => {
    await app.close();
  });

  async function painel(consulta = ""): Promise<Painel> {
    const resposta = await admin.api.get(`/contabil/painel${consulta}`, admin.token);
    if (resposta.status !== 200) throw new Error(`painel: ${resposta.status} ${resposta.text}`);
    return resposta.body;
  }

  /** Mensalidade de um mês atrás, ainda em aberto (vencida). */
  async function mensalidadeVencida(valorCentavos: number) {
    const { api, token, usuario } = admin;
    const alunoId = await criarAluno(api, token);
    const planoId = await criarPlano(api, token);
    return mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(1), valorCentavos);
  }

  async function pagar(mensalidadeId: string, forma: string) {
    const { api, token } = admin;
    const pago = await api
      .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma, data: hoje() }, token)
      .expect(201);
    return pago.body.id as string;
  }

  it("FOCO-CA-09: recebido, estornos, resultado, formas e vencidas, conferindo com o livro-razão", async () => {
    const { api, token } = admin;
    const antes = await painel();

    await pagar(await mensalidadeVencida(15000), "PIX");
    const estornado = await pagar(await mensalidadeVencida(9000), "CARTAO_CREDITO");
    await api.post(`/pagamentos/${estornado}/estornar`, { motivo: "Engano" }, token).expect(200);
    await mensalidadeVencida(12000);

    const depois = await painel();
    expect(depois.recebido - antes.recebido).toBe(24000);
    expect(depois.estornos - antes.estornos).toBe(9000);
    expect(depois.resultado - antes.resultado).toBe(15000);
    expect(depois.resultado).toBe(depois.recebido - depois.estornos);
    expect(depois.naoClassificado).toBe(0);

    // A conferência bate com a soma direta do livro-razão no período.
    const { de, ate } = depois.periodo;
    const somas = await prisma.lancamento.groupBy({
      by: ["tipo"],
      where: { data: { gte: paraDataDoBanco(de), lte: paraDataDoBanco(ate) } },
      _sum: { valorCentavos: true },
    });
    const soma = (tipo: string) => somas.find((s) => s.tipo === tipo)?._sum.valorCentavos ?? 0;
    expect(depois.entradas).toBe(soma("ENTRADA"));
    expect(depois.saidas).toBe(soma("SAIDA"));
    expect(depois.resultado).toBe(depois.entradas - depois.saidas);
    expect(depois.confere).toBe(true);

    // Totais por forma.
    expect(Object.keys(depois.porForma).sort()).toEqual([
      "CARTAO_CREDITO",
      "CARTAO_DEBITO",
      "DINHEIRO",
      "PIX",
    ]);
    const credito = depois.porForma["CARTAO_CREDITO"]!;
    expect(credito.entradas - antes.porForma["CARTAO_CREDITO"]!.entradas).toBe(9000);
    expect(credito.saidas - antes.porForma["CARTAO_CREDITO"]!.saidas).toBe(9000);
    expect(depois.porForma["PIX"]!.saldo - antes.porForma["PIX"]!.saldo).toBe(15000);

    // Vencidas e não pagas: a de 12.000 e a estornada, que voltou a ficar devida.
    expect(depois.aReceber.quantidade - antes.aReceber.quantidade).toBe(2);
    expect(depois.aReceber.valorCentavos - antes.aReceber.valorCentavos).toBe(21000);
  });

  it("CONT-CA-03: mês atual por padrão, mês escolhido ou intervalo de até 366 dias", async () => {
    const mes = competenciaAtual(new Date());
    expect((await painel()).periodo).toEqual(periodoDoMes(mes));
    expect((await painel("?competencia=2026-02")).periodo).toEqual({
      de: "2026-02-01",
      ate: "2026-02-28",
    });
    expect((await painel("?de=2026-01-01&ate=2027-01-01")).periodo).toEqual({
      de: "2026-01-01",
      ate: "2027-01-01",
    });
    const { api, token } = admin;
    for (const consulta of [
      "?de=2026-01-01&ate=2027-01-02",
      "?de=2026-02-10&ate=2026-02-01",
      "?de=2026-02-30&ate=2026-03-01",
      "?de=2026-02-01",
      "?competencia=2026-13",
      "?competencia=2026-02&de=2026-01-01&ate=2026-01-02",
    ]) {
      await api.get(`/contabil/painel${consulta}`, token).expect(400);
    }
  });

  it("CONT-CA-04: o comparativo traz os 12 meses que terminam no mês do fim do período", async () => {
    const atual = await painel();
    expect(atual.comparativo).toHaveLength(12);
    const ultimo = atual.comparativo.at(-1);
    expect(ultimo).toEqual({
      competencia: competenciaAtual(new Date()),
      recebido: atual.recebido,
      estornos: atual.estornos,
      resultado: atual.resultado,
    });
    const fevereiro = await painel("?competencia=2026-02");
    expect(fevereiro.comparativo.map((m) => m.competencia)).toEqual([
      "2025-03",
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("CONT-CA-09: a exportação traz os lançamentos do período e fica na auditoria", async () => {
    const { api, token, usuario } = admin;
    const resposta = await api.get("/contabil/lancamentos", token).expect(200);
    const { periodo, lancamentos } = resposta.body;
    expect(periodo).toEqual(periodoDoMes(competenciaAtual(new Date())));
    expect(lancamentos.length).toBeGreaterThan(0);
    expect(lancamentos[0]).toEqual({
      data: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      tipo: expect.stringMatching(/^(ENTRADA|SAIDA)$/),
      categoria: expect.any(String),
      forma: expect.any(String),
      valorCentavos: expect.any(Number),
      descricao: expect.any(String),
      estorno: expect.any(Boolean),
    });
    expect(lancamentos.some((l: { estorno: boolean }) => l.estorno)).toBe(true);
    const total = await prisma.lancamento.count({
      where: {
        data: { gte: paraDataDoBanco(periodo.de), lte: paraDataDoBanco(periodo.ate) },
      },
    });
    expect(lancamentos).toHaveLength(total);
    const registro = await prisma.auditoria.findFirst({
      where: { acao: "CONTABIL_EXPORTADO", atorId: usuario.id },
      orderBy: { id: "desc" },
    });
    expect(registro?.detalhes).toEqual({ ...periodo, linhas: total });
    expect(registro?.ip).toEqual(expect.any(String));
    await api.get("/contabil/lancamentos?de=2026-01-01&ate=2027-06-01", token).expect(400);
  });

  it("CONT-CA-10: só o administrador acessa o Contábil", async () => {
    for (const perfil of ["ATENDENTE"] as const) {
      const { api, token } = await logado(app, perfil);
      await api.get("/contabil/painel", token).expect(403);
      await api.get("/contabil/lancamentos", token).expect(403);
    }
  });
});
