import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { somarDias } from "../src/horarios/regras.js";
import { competenciaAtual } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { logado } from "./apoio-aulas.js";

const hoje = () => hojeEmSaoPaulo(new Date());
const mesAtual = () => competenciaAtual(new Date());

type Painel = {
  recebido: number;
  estornos: number;
  totalGastos: number;
  outrasReceitas: number;
  resultado: number;
  saldoInicial: number;
  aportes: number;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  caixa: { saldoCentavos: number };
  comparativo: { competencia: string; outrasReceitas: number; resultado: number }[];
};

type Entrada = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  nomeCategoria: string;
  ehEstorno: boolean;
  estorno: { id: string } | null;
};

describe("Etapa 21: entrada manual no caixa", () => {
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

  const entrada = (extra: Record<string, unknown> = {}) => ({
    categoria: "OUTRA_RECEITA",
    descricao: "Aula avulsa de sábado",
    data: hoje(),
    valorCentavos: 5000,
    forma: "PIX",
    ...extra,
  });

  const saldo = async () =>
    (await admin.api.get("/gastos/saldo", admin.token).expect(200)).body.saldoCentavos as number;

  const doMes = async () =>
    (await admin.api.get(`/gastos/entradas?competencia=${mesAtual()}`, admin.token).expect(200))
      .body.entradas as Entrada[];

  it("ENTRADA-CA-01: lança outra receita e aporte no livro-razão; dados ruins são recusados", async () => {
    const { api, token } = admin;
    const receita = await api
      .post("/gastos/entradas", entrada({ data: somarDias(hoje(), -2), forma: "DINHEIRO" }), token)
      .expect(201);
    expect(await prisma.lancamento.findUnique({ where: { id: receita.body.id } })).toMatchObject({
      tipo: "ENTRADA",
      categoria: "OUTRA_RECEITA",
      valorCentavos: 5000,
      forma: "DINHEIRO",
      data: paraDataDoBanco(somarDias(hoje(), -2)),
      descricao: "Aula avulsa de sábado",
      estornoDeId: null,
    });
    const aporte = await api
      .post(
        "/gastos/entradas",
        entrada({ categoria: "APORTE", descricao: "Dinheiro do dono", valorCentavos: 30000 }),
        token,
      )
      .expect(201);
    expect(await prisma.lancamento.findUnique({ where: { id: aporte.body.id } })).toMatchObject({
      tipo: "ENTRADA",
      categoria: "APORTE",
      valorCentavos: 30000,
    });

    for (const errado of [
      entrada({ data: somarDias(hoje(), 1) }),
      entrada({ data: "2026-02-30" }),
      entrada({ valorCentavos: 0 }),
      entrada({ valorCentavos: 10_000_001 }),
      entrada({ valorCentavos: 10.5 }),
      entrada({ descricao: "ab" }),
      entrada({ categoria: "MENSALIDADE" }),
      entrada({ categoria: "SALDO_INICIAL" }),
      entrada({ categoria: "EQUIPAMENTO" }),
      entrada({ forma: "CHEQUE" }),
    ]) {
      const resposta = await api.post("/gastos/entradas", errado, token);
      expect(resposta.status, JSON.stringify(errado)).toBe(400);
    }
  });

  it("ENTRADA-CA-02: a entrada aumenta o saldo em caixa e aparece nas entradas do mês", async () => {
    const antes = await saldo();
    const criado = await admin.api
      .post("/gastos/entradas", entrada({ valorCentavos: 12345 }), admin.token)
      .expect(201);
    expect(await saldo()).toBe(antes + 12345);
    const lista = await doMes();
    expect(lista.find((e) => e.id === criado.body.id)).toMatchObject({
      tipo: "ENTRADA",
      categoria: "OUTRA_RECEITA",
      nomeCategoria: "Outra receita",
      ehEstorno: false,
      estorno: null,
    });
    // As entradas não aparecem entre as saídas.
    const saidas = (await admin.api.get("/gastos", admin.token).expect(200)).body.saidas as {
      id: string;
    }[];
    expect(saidas.some((s) => s.id === criado.body.id)).toBe(false);
  });

  it("ENTRADA-CA-03: estorno com motivo lança a saída contrária ligada à entrada; o saldo volta", async () => {
    const { api, token } = admin;
    const criado = await api
      .post("/gastos/entradas", entrada({ categoria: "APORTE", valorCentavos: 8000 }), token)
      .expect(201);
    const comEntrada = await saldo();
    await api.post(`/gastos/${criado.body.id}/estorno`, {}, token).expect(400);
    const estorno = await api
      .post(`/gastos/${criado.body.id}/estorno`, { motivo: "Lançado em dobro" }, token)
      .expect(201);
    expect(await prisma.lancamento.findUnique({ where: { id: estorno.body.id } })).toMatchObject({
      tipo: "SAIDA",
      categoria: "APORTE",
      valorCentavos: 8000,
      forma: "PIX",
      data: paraDataDoBanco(hoje()),
      descricao: "Estorno: Lançado em dobro",
      estornoDeId: criado.body.id,
    });
    expect(await saldo()).toBe(comEntrada - 8000);
    await api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "De novo" }, token).expect(409);
    await api.post(`/gastos/${estorno.body.id}/estorno`, { motivo: "Volta" }, token).expect(400);

    const lista = await doMes();
    expect(lista.find((e) => e.id === criado.body.id)?.estorno?.id).toBe(estorno.body.id);
    expect(lista.find((e) => e.id === estorno.body.id)).toMatchObject({
      tipo: "SAIDA",
      ehEstorno: true,
    });

    // Dois estornos ao mesmo tempo: só um entra.
    const outro = await api.post("/gastos/entradas", entrada(), token).expect(201);
    const respostas = await Promise.all(
      [1, 2].map(() => api.post(`/gastos/${outro.body.id}/estorno`, { motivo: "Engano" }, token)),
    );
    expect(respostas.map((r) => r.status).toSorted((x, y) => x - y)).toEqual([201, 409]);
  });

  it("ENTRADA-CA-04: outras receitas entram no resultado; o aporte fica à parte e a conferência bate", async () => {
    const { api, token } = admin;
    const painel = async (): Promise<Painel> =>
      (await api.get("/contabil/painel", token).expect(200)).body;
    const antes = await painel();
    await api.post("/gastos/entradas", entrada({ valorCentavos: 7000 }), token).expect(201);
    await api
      .post("/gastos/entradas", entrada({ categoria: "APORTE", valorCentavos: 50000 }), token)
      .expect(201);
    const depois = await painel();
    expect(depois.outrasReceitas - antes.outrasReceitas).toBe(7000);
    expect(depois.aportes - antes.aportes).toBe(50000);
    expect(depois.resultado - antes.resultado).toBe(7000);
    expect(depois.recebido).toBe(antes.recebido);
    expect(depois.entradas - antes.entradas).toBe(57000);
    expect(depois.caixa.saldoCentavos - antes.caixa.saldoCentavos).toBe(57000);
    expect(depois.resultado).toBe(
      depois.recebido - depois.estornos + depois.outrasReceitas - depois.totalGastos,
    );
    expect(depois.naoClassificado).toBe(0);
    expect(depois.confere).toBe(true);
    expect(depois.comparativo.at(-1)).toMatchObject({
      competencia: mesAtual(),
      outrasReceitas: depois.outrasReceitas,
      resultado: depois.resultado,
    });
  });

  it("ENTRADA-CA-05: o atendente não lança, não estorna e não vê entradas", async () => {
    const criado = await admin.api.post("/gastos/entradas", entrada(), admin.token).expect(201);
    const { api, token } = await logado(app, "ATENDENTE");
    const tentativas = await Promise.all([
      api.get("/gastos/entradas", token),
      api.post("/gastos/entradas", entrada(), token),
      api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "Tentativa" }, token),
    ]);
    for (const resposta of tentativas) expect(resposta.status).toBe(403);
    expect(await prisma.lancamento.count({ where: { estornoDeId: criado.body.id } })).toBe(0);
  });

  it("ENTRADA-CA-06: entradas e estornos de entrada ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const criado = await api.post("/gastos/entradas", entrada(), token).expect(201);
    await api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "Engano" }, token).expect(201);
    const registros = await prisma.auditoria.findMany({
      where: { atorId: usuario.id, acao: { not: "LOGIN_SUCESSO" } },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual(["ENTRADA_REGISTRADA", "LANCAMENTO_ESTORNADO"]);
    expect(registros[0]).toMatchObject({ alvoTipo: "Lancamento", alvoId: criado.body.id });
    for (const r of registros) {
      expect(r.ip).toBeTruthy();
      expect(r.criadaEm).toBeInstanceOf(Date);
    }
  });
});
