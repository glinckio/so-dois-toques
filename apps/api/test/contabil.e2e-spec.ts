import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { periodoDoMes } from "../src/contabil/regras.js";
import { somarDias } from "../src/horarios/regras.js";
import { competenciaAtual } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, criarLocal, logado, unico } from "./apoio-aulas.js";
import { criarPlano, mensalidadeNoPassado, mesesAtras } from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());

type Painel = {
  periodo: { de: string; ate: string };
  receitas: Record<string, number>;
  despesas: Record<string, number>;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  margemPercentual: number | null;
  gaveta: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  porForma: Record<string, { entradas: number; saidas: number; saldo: number }>;
  comparativo: { competencia: string; receitas: number; despesas: number; resultado: number }[];
  lanchonete: {
    vendidoCentavos: number;
    custoCentavos: number;
    margemBrutaCentavos: number;
  };
  ocupacao: {
    id: string;
    nome: string;
    turnos: Record<
      string,
      { abertas: number; bloqueadas: number; reservadas: number; ocupacaoPercentual: number | null }
    >;
    total: { reservadas: number };
  }[];
  aReceber: {
    mensalidades: { quantidade: number; valorCentavos: number };
    reservas: { quantidade: number; valorCentavos: number };
  };
};

describe("Etapa 8: painel contábil", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;
  let quadra1: string;
  let quadra2: string;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
    const { api, token } = admin;
    await prisma.faixaPreco.deleteMany();
    await api
      .post(
        "/horarios/faixas",
        { dias: [0, 1, 2, 3, 4, 5, 6], horaInicio: 8, horaFim: 22, valorHoraCentavos: 5000 },
        token,
      )
      .expect(201);
    const quadras = (await api.get("/horarios/quadras", token).expect(200)).body;
    quadra1 = quadras[0].id;
    quadra2 = quadras[1].id;
    const turno = (await api.get("/caixa/sessao", token).expect(200)).body.turno;
    if (!turno) await api.post("/caixa/sessoes", { trocoInicialCentavos: 0 }, token).expect(201);
  });

  afterAll(async () => {
    const { api, token } = admin;
    const turno = (await api.get("/caixa/sessao", token).expect(200)).body.turno;
    if (turno) {
      await api
        .post(
          `/caixa/sessoes/${turno.id}/fechar`,
          {
            contadoDinheiroCentavos: Math.max(turno.esperadoDinheiroCentavos, 0),
            observacao: "Fim do teste",
          },
          token,
        )
        .expect(200);
    }
    await app.close();
  });

  async function painel(consulta = ""): Promise<Painel> {
    const resposta = await admin.api.get(`/contabil/painel${consulta}`, admin.token);
    if (resposta.status !== 200) throw new Error(`painel: ${resposta.status} ${resposta.text}`);
    return resposta.body;
  }

  const diferenca = (antes: Record<string, number>, depois: Record<string, number>) =>
    Object.fromEntries(Object.keys(depois).map((k) => [k, (depois[k] ?? 0) - (antes[k] ?? 0)]));

  async function produtoComSaldo(quantidade: number, totalCentavos: number, preco = 800) {
    const { api, token } = admin;
    const produtoId = (
      await api.post("/produtos", { nome: unico("Coco"), precoCentavos: preco }, token).expect(201)
    ).body.id as string;
    const compra = await api
      .post(
        "/estoque/compras",
        { produtoId, quantidade, totalCentavos, forma: "DINHEIRO", data: hoje() },
        token,
      )
      .expect(201);
    return { produtoId, compraId: compra.body.id as string };
  }

  async function reservaPaga(data: string, horaInicio: number, duracao = 1) {
    const { api, token } = admin;
    const r = await api
      .post(
        "/horarios/reservas",
        {
          tipo: "RESERVA",
          repeticao: "AVULSA",
          quadraId: quadra1,
          data,
          horaInicio,
          duracao,
          clienteNome: "Cliente Contábil",
        },
        token,
      )
      .expect(201);
    await api.post(`/horarios/reservas/${r.body.id}/pagar`, { forma: "PIX" }, token).expect(200);
    return r.body.id as string;
  }

  it("CONT-CA-01 e CONT-CA-02: soma receitas e despesas por origem, desconta estornos e confere com o Caixa", async () => {
    const { api, token, usuario } = admin;
    const antes = await painel();

    // Aulas: mensalidade paga hoje.
    const alunoId = await criarAluno(api, token);
    const planoId = await criarPlano(api, token);
    const mensalidadeId = await mensalidadeNoPassado(
      app,
      alunoId,
      planoId,
      usuario.id,
      mesesAtras(1),
      15000,
    );
    await api
      .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
      .expect(201);
    // Locação.
    await reservaPaga(somarDias(hoje(), 175), 18, 2);
    // Lanchonete: compra (estoque) e venda; uma venda estornada.
    const { produtoId } = await produtoComSaldo(10, 3000);
    await api
      .post("/estoque/vendas", { itens: [{ produtoId, quantidade: 2 }], forma: "PIX" }, token)
      .expect(201);
    const estornada = await api
      .post("/estoque/vendas", { itens: [{ produtoId, quantidade: 1 }], forma: "PIX" }, token)
      .expect(201);
    await api
      .post(`/estoque/vendas/${estornada.body.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    // Quadra parceira.
    const localId = await criarLocal(api, token);
    await api
      .post(
        "/custos/pagamentos",
        {
          localId,
          competencia: competenciaAtual(new Date()),
          valorCentavos: 7000,
          forma: "PIX",
          data: hoje(),
        },
        token,
      )
      .expect(201);
    // Avulsos: receita, despesa (uma estornada), suprimento e sangria.
    const avulso = (categoria: string, valorCentavos: number, forma = "DINHEIRO") =>
      api
        .post("/caixa/avulsos", { categoria, forma, valorCentavos, descricao: "Teste" }, token)
        .expect(201);
    await avulso("RECEITA_AVULSA", 2500, "PIX");
    await avulso("DESPESA", 400);
    const despesaErrada = await avulso("DESPESA", 900);
    await api
      .post(`/caixa/avulsos/${despesaErrada.body.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    await avulso("SUPRIMENTO", 3000);
    await avulso("SANGRIA", 1000);

    const depois = await painel();
    expect(diferenca(antes.receitas, depois.receitas)).toEqual({
      AULAS: 15000,
      LOCACAO: 10000,
      LANCHONETE: 1600,
      OUTRAS: 2500,
    });
    expect(diferenca(antes.despesas, depois.despesas)).toEqual({
      ESTOQUE: 3000,
      QUADRAS_PARCEIRAS: 7000,
      OUTRAS: 400,
    });
    expect(depois.gaveta - antes.gaveta).toBe(2000);
    expect(depois.resultado).toBe(depois.totalReceitas - depois.totalDespesas);
    expect(depois.resultado - antes.resultado).toBe(
      15000 + 10000 + 1600 + 2500 - 3000 - 7000 - 400,
    );

    // A conferência bate com a soma direta dos lançamentos do Caixa no período.
    const { de, ate } = depois.periodo;
    const somas = await prisma.lancamento.groupBy({
      by: ["tipo"],
      where: { data: { gte: paraDataDoBanco(de), lte: paraDataDoBanco(ate) } },
      _sum: { valorCentavos: true },
    });
    const soma = (tipo: string) => somas.find((s) => s.tipo === tipo)?._sum.valorCentavos ?? 0;
    expect(depois.entradas).toBe(soma("ENTRADA"));
    expect(depois.saidas).toBe(soma("SAIDA"));
    expect(depois.resultado + depois.gaveta).toBe(depois.entradas - depois.saidas);
    expect(depois.confere).toBe(true);
    expect(depois.margemPercentual).toEqual(expect.any(Number));
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
      receitas: atual.totalReceitas,
      despesas: atual.totalDespesas,
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

  it("CONT-CA-05: lanchonete mostra vendido, custo e margem bruta sem as vendas estornadas", async () => {
    const { api, token } = admin;
    const antes = (await painel()).lanchonete;
    // 10 unidades por R$ 30,00: custo médio de R$ 3,00.
    const { produtoId } = await produtoComSaldo(10, 3000, 800);
    await api
      .post("/estoque/vendas", { itens: [{ produtoId, quantidade: 3 }], forma: "PIX" }, token)
      .expect(201);
    const estornada = await api
      .post("/estoque/vendas", { itens: [{ produtoId, quantidade: 2 }], forma: "PIX" }, token)
      .expect(201);
    await api
      .post(`/estoque/vendas/${estornada.body.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    const depois = (await painel()).lanchonete;
    expect(depois.vendidoCentavos - antes.vendidoCentavos).toBe(2400);
    expect(depois.custoCentavos - antes.custoCentavos).toBe(900);
    expect(depois.margemBrutaCentavos - antes.margemBrutaCentavos).toBe(1500);
  });

  it("CONT-CA-06: ocupação por quadra e turno é reservadas sobre abertas menos bloqueadas", async () => {
    const { api, token } = admin;
    const dia = somarDias(hoje(), 176);
    const reservar = (corpo: Record<string, unknown>) =>
      api
        .post(
          "/horarios/reservas",
          {
            tipo: "RESERVA",
            repeticao: "AVULSA",
            quadraId: quadra1,
            data: dia,
            duracao: 1,
            clienteNome: "Ana",
            ...corpo,
          },
          token,
        )
        .expect(201);
    await reservar({ horaInicio: 9, duracao: 2 });
    await reservar({ horaInicio: 19, duracao: 3 });
    await reservar({ horaInicio: 14, quadraId: quadra2 });
    const cancelada = await reservar({ horaInicio: 15 });
    await api
      .post(`/horarios/reservas/${cancelada.body.id}/cancelar`, { motivo: "Desistiu" }, token)
      .expect(200);
    await reservar({ tipo: "BLOQUEIO", motivo: "Aula", clienteNome: undefined, horaInicio: 8 });

    const { ocupacao } = await painel(`?de=${dia}&ate=${dia}`);
    // Faixa das 8h às 22h: manhã 4 horas, tarde 6, noite 4.
    expect(ocupacao.map((q) => q.nome)).toEqual(["Quadra 1", "Quadra 2"]);
    expect(ocupacao[0]?.turnos).toEqual({
      MANHA: { abertas: 4, bloqueadas: 1, reservadas: 2, ocupacaoPercentual: 66.7 },
      TARDE: { abertas: 6, bloqueadas: 0, reservadas: 0, ocupacaoPercentual: 0 },
      NOITE: { abertas: 4, bloqueadas: 0, reservadas: 3, ocupacaoPercentual: 75 },
    });
    expect(ocupacao[1]?.turnos["TARDE"]).toEqual({
      abertas: 6,
      bloqueadas: 0,
      reservadas: 1,
      ocupacaoPercentual: 16.7,
    });
    expect(ocupacao[0]?.total.reservadas).toBe(5);
  });

  it("CONT-CA-07: a receber mostra mensalidades vencidas e reservas começadas sem pagamento", async () => {
    const { api, token, usuario } = admin;
    const ontem = somarDias(hoje(), -1);
    const consulta = `?de=${ontem}&ate=${ontem}`;
    const antes = (await painel(consulta)).aReceber;

    const alunoId = await criarAluno(api, token);
    const planoId = await criarPlano(api, token);
    await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(2), 12000);
    const naoPaga = await prisma.reserva.create({
      data: {
        tipo: "RESERVA",
        quadraId: quadra2,
        data: paraDataDoBanco(ontem),
        horaInicio: 21,
        horaFim: 22,
        clienteNome: "Cliente Atrasado",
        valorCentavos: 5000,
        criadaPorId: usuario.id,
      },
    });
    const paga = await prisma.reserva.create({
      data: {
        tipo: "RESERVA",
        quadraId: quadra2,
        data: paraDataDoBanco(ontem),
        horaInicio: 20,
        horaFim: 21,
        clienteNome: "Cliente em Dia",
        valorCentavos: 5000,
        criadaPorId: usuario.id,
      },
    });
    await api.post(`/horarios/reservas/${paga.id}/pagar`, { forma: "PIX" }, token).expect(200);

    const depois = (await painel(consulta)).aReceber;
    expect(depois.mensalidades.quantidade - antes.mensalidades.quantidade).toBe(1);
    expect(depois.mensalidades.valorCentavos - antes.mensalidades.valorCentavos).toBe(12000);
    expect(depois.reservas.quantidade - antes.reservas.quantidade).toBe(1);
    expect(depois.reservas.valorCentavos - antes.reservas.valorCentavos).toBe(5000);
    expect(naoPaga.id).toEqual(expect.any(String));
  });

  it("CONT-CA-08: totais por forma de pagamento com entradas, saídas e saldo", async () => {
    const { api, token } = admin;
    const antes = (await painel()).porForma;
    await api
      .post(
        "/caixa/avulsos",
        {
          categoria: "RECEITA_AVULSA",
          forma: "CARTAO_CREDITO",
          valorCentavos: 1100,
          descricao: "Teste",
        },
        token,
      )
      .expect(201);
    await api
      .post(
        "/caixa/avulsos",
        { categoria: "DESPESA", forma: "CARTAO_CREDITO", valorCentavos: 300, descricao: "Teste" },
        token,
      )
      .expect(201);
    const depois = (await painel()).porForma;
    expect(Object.keys(depois).sort()).toEqual([
      "CARTAO_CREDITO",
      "CARTAO_DEBITO",
      "DINHEIRO",
      "PIX",
    ]);
    const credito = depois["CARTAO_CREDITO"];
    const anterior = antes["CARTAO_CREDITO"];
    expect(credito && anterior && credito.entradas - anterior.entradas).toBe(1100);
    expect(credito && anterior && credito.saidas - anterior.saidas).toBe(300);
    expect(credito && credito.saldo).toBe(credito && credito.entradas - credito.saidas);
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
    for (const perfil of ["ATENDENTE", "PROFESSOR"] as const) {
      const { api, token } = await logado(app, perfil);
      await api.get("/contabil/painel", token).expect(403);
      await api.get("/contabil/lancamentos", token).expect(403);
    }
  });
});
