import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { LancamentoMensalService } from "../src/gastos/lancamento-mensal.service.js";
import { somarDias } from "../src/horarios/regras.js";
import { competenciaAtual, proximaCompetencia, vencimentoEm } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, criarTurma, logado, unico } from "./apoio-aulas.js";
import { criarPlano, mensalidadeNoPassado, mesesAtras } from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());
const mesAtual = () => competenciaAtual(new Date());

type Painel = {
  recebido: number;
  estornos: number;
  gastos: Record<string, number>;
  totalGastos: number;
  outrasReceitas: number;
  resultado: number;
  saldoInicial: number;
  aportes: number;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  caixa: { saldoInicial: { valorCentavos: number; data: string } | null; saldoCentavos: number };
  comparativo: { competencia: string; gastos: number; resultado: number }[];
};

describe("Etapa 17: quadras alugadas, gastos e saldo do caixa", () => {
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

  async function novaQuadra() {
    const resposta = await admin.api.post(
      "/horarios/quadras",
      { nome: unico("Quadra") },
      admin.token,
    );
    if (resposta.status !== 201) throw new Error(`quadra: ${resposta.status} ${resposta.text}`);
    return resposta.body as { id: string; nome: string; ativa: boolean };
  }

  async function painel(): Promise<Painel> {
    return (await admin.api.get("/contabil/painel", admin.token).expect(200)).body;
  }

  const contrato = (quadraId: string, extra: Record<string, unknown> = {}) => ({
    quadraId,
    diaSemana: 2,
    horaInicio: 19 * 60,
    horaFim: 20 * 60,
    valorCentavos: 80000,
    diaPagamento: 1,
    forma: "PIX",
    inicio: mesAtual(),
    ...extra,
  });

  const gasto = (extra: Record<string, unknown> = {}) => ({
    categoria: "EQUIPAMENTO",
    descricao: "Bolas novas",
    data: hoje(),
    valorCentavos: 25000,
    forma: "PIX",
    ...extra,
  });

  it("GASTO-CA-01: cadastra, renomeia e desativa quadras; nome repetido é recusado; desativada não recebe nada novo", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    expect(quadra.ativa).toBe(true);
    await api.post("/horarios/quadras", { nome: quadra.nome }, token).expect(409);
    await api.post("/horarios/quadras", { nome: "x" }, token).expect(400);

    const outra = await novaQuadra();
    await api
      .patch(`/horarios/quadras/${outra.id}`, { nome: quadra.nome, ativa: true }, token)
      .expect(409);
    const novoNome = unico("Arena");
    await api
      .patch(`/horarios/quadras/${quadra.id}`, { nome: novoNome, ativa: false }, token)
      .expect(200);
    const lista = (await api.get("/horarios/quadras", token).expect(200)).body;
    expect(lista).toContainEqual({ id: quadra.id, nome: novoNome, ativa: false });

    const recusas = await Promise.all([
      api.post(
        "/turmas",
        {
          quadraId: quadra.id,
          diaSemana: 1,
          horaInicio: 600,
          horaFim: 660,
          nivel: "INICIANTE",
          categoria: "MISTO",
          vagas: 8,
        },
        token,
      ),
      api.post("/gastos/contratos", contrato(quadra.id), token),
      api.post(
        "/gastos/locacoes",
        { quadraId: quadra.id, data: hoje(), valorCentavos: 5000, forma: "PIX" },
        token,
      ),
      api.post(
        "/horarios/bloqueios",
        {
          repeticao: "AVULSO",
          quadraId: quadra.id,
          data: somarDias(hoje(), 3),
          horaInicio: 10,
          horaFim: 11,
          motivo: "Pintura",
        },
        token,
      ),
    ]);
    for (const resposta of recusas) {
      expect(resposta.status, resposta.text).toBe(400);
      expect(resposta.body.message).toBe("Escolha uma quadra ativa.");
    }
  });

  it("GASTO-CA-02: turmas sobrepostas só são recusadas na mesma quadra; agenda e bloqueios são de uma quadra", async () => {
    const { api, token } = admin;
    const a = await novaQuadra();
    const b = await novaQuadra();
    const data = somarDias(hoje(), 7);
    const dia = paraDataDoBanco(data).getUTCDay();
    const horario = { diaSemana: dia, horaInicio: 10 * 60, horaFim: 11 * 60 };
    const naA = await criarTurma(api, token, { quadraId: a.id, ...horario });
    const recusada = await api
      .post(
        "/turmas",
        { quadraId: a.id, ...horario, nivel: "AVANCADO", categoria: "MISTO", vagas: 4 },
        token,
      )
      .expect(409);
    expect(recusada.body.message).toMatch(/^A quadra já tem a turma de /);
    const naB = await criarTurma(api, token, { quadraId: b.id, ...horario });

    const turma = (await api.get(`/turmas/${naB}`, token).expect(200)).body;
    expect(turma.quadra).toEqual({ id: b.id, nome: b.nome });

    // Bloqueio na quadra B não esbarra na turma da quadra A, mas na da B, sim.
    await api
      .post(
        "/horarios/bloqueios",
        {
          repeticao: "AVULSO",
          quadraId: b.id,
          data,
          horaInicio: 10,
          horaFim: 11,
          motivo: "Torneio",
        },
        token,
      )
      .expect(409);
    await api.post(`/turmas/${naB}/encerrar`, {}, token).expect(200);
    await api
      .post(
        "/horarios/bloqueios",
        {
          repeticao: "AVULSO",
          quadraId: b.id,
          data,
          horaInicio: 10,
          horaFim: 11,
          motivo: "Torneio",
        },
        token,
      )
      .expect(201);

    const gradeA = (await api.get(`/horarios/grade?data=${data}&quadra=${a.id}`, token).expect(200))
      .body;
    expect(gradeA.quadra).toEqual({ id: a.id, nome: a.nome, ativa: true });
    expect(gradeA.aulas.map((x: { turmaId: string }) => x.turmaId)).toEqual([naA]);
    expect(gradeA.bloqueios).toEqual([]);
    const gradeB = (await api.get(`/horarios/grade?data=${data}&quadra=${b.id}`, token).expect(200))
      .body;
    expect(gradeB.aulas).toEqual([]);
    expect(gradeB.bloqueios).toHaveLength(1);
  });

  it("GASTO-CA-03: o contrato mensal guarda quadra, dia, horário, valor, pagamento, forma e início; fora das faixas é recusado", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    const proximo = proximaCompetencia(mesAtual());
    const criado = await api
      .post("/gastos/contratos", contrato(quadra.id, { inicio: proximo, diaPagamento: 10 }), token)
      .expect(201);
    expect(criado.body.lancados).toBe(0);
    const lista = (await api.get("/gastos/contratos", token).expect(200)).body;
    expect(lista.find((c: { id: string }) => c.id === criado.body.id)).toEqual({
      id: criado.body.id,
      quadra: { id: quadra.id, nome: quadra.nome },
      diaSemana: 2,
      horaInicio: 1140,
      horaFim: 1200,
      horario: "Terça, 19:00 às 20:00",
      valorCentavos: 80000,
      diaPagamento: 10,
      forma: "PIX",
      inicio: proximo,
      fim: null,
      vigente: true,
    });

    for (const errado of [
      { valorCentavos: 99 },
      { valorCentavos: 2_000_001 },
      { diaPagamento: 0 },
      { diaPagamento: 29 },
      { horaInicio: 1200, horaFim: 1140 },
      { horaInicio: 4 * 60 },
      { diaSemana: 7 },
      { forma: "BOLETO" },
      { inicio: "2026-13" },
      { inicio: mesesAtras(1) },
      { quadraId: "nao-e-uuid" },
    ]) {
      const resposta = await api.post("/gastos/contratos", contrato(quadra.id, errado), token);
      expect(resposta.status, JSON.stringify(errado)).toBe(400);
    }
  });

  it("GASTO-CA-04: lança uma saída por mês no dia do pagamento, mesmo com execuções simultâneas; encerrado não lança mais", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    const lancador = app.get(LancamentoMensalService);
    const lancamentosDo = (id: string) =>
      prisma.lancamento.findMany({
        where: { categoria: "ALUGUEL_MENSAL", origemId: { startsWith: `${id}:` } },
        orderBy: { data: "asc" },
      });

    // Dia de pagamento 1: o deste mês já passou (ou é hoje) e entra no dia do registro.
    const atrasado = await api
      .post("/gastos/contratos", contrato(quadra.id, { diaPagamento: 1 }), token)
      .expect(201);
    expect(atrasado.body.lancados).toBe(1);
    const [primeiro] = await lancamentosDo(atrasado.body.id);
    expect(primeiro).toMatchObject({
      tipo: "SAIDA",
      valorCentavos: 80000,
      forma: "PIX",
      data: paraDataDoBanco(hoje()),
      origemTipo: "ContratoQuadra",
      origemId: `${atrasado.body.id}:${mesAtual()}`,
      criadoPorId: admin.usuario.id,
    });
    expect(primeiro?.descricao).toMatch(
      new RegExp(`^Aluguel mensal: ${quadra.nome}, terça 19:00 às 20:00, `),
    );

    // Dois meses depois, no dia do pagamento, com duas execuções ao mesmo tempo.
    const daqui2 = proximaCompetencia(proximaCompetencia(mesAtual()));
    const dia = new Date(`${vencimentoEm(daqui2, 1)}T15:00:00Z`);
    await Promise.all([lancador.lancar(dia), lancador.lancar(dia), lancador.lancar(dia)]);
    const lancados = await lancamentosDo(atrasado.body.id);
    expect(lancados.map((l) => l.origemId)).toEqual([
      `${atrasado.body.id}:${mesAtual()}`,
      `${atrasado.body.id}:${proximaCompetencia(mesAtual())}`,
      `${atrasado.body.id}:${daqui2}`,
    ]);
    expect(lancados[2]?.data).toEqual(paraDataDoBanco(vencimentoEm(daqui2, 1)));

    // Encerrado a partir do mês que vem: o mês que vem já lançado fica, os seguintes não entram.
    const outro = await api
      .post(
        "/gastos/contratos",
        contrato(quadra.id, { diaPagamento: 1, valorCentavos: 50000 }),
        token,
      )
      .expect(201);
    const mesQueVem = proximaCompetencia(mesAtual());
    await api
      .post(`/gastos/contratos/${outro.body.id}/encerrar`, { fim: mesQueVem }, token)
      .expect(201);
    await api
      .post(`/gastos/contratos/${outro.body.id}/encerrar`, { fim: mesQueVem }, token)
      .expect(409);
    await lancador.lancar(new Date(`${vencimentoEm(daqui2, 28)}T15:00:00Z`));
    expect((await lancamentosDo(outro.body.id)).map((l) => l.origemId)).toEqual([
      `${outro.body.id}:${mesAtual()}`,
    ]);
    const lista = (await api.get("/gastos/contratos", token).expect(200)).body;
    expect(lista.find((c: { id: string }) => c.id === outro.body.id)).toMatchObject({
      fim: mesQueVem,
      vigente: true,
    });
  });

  it("GASTO-CA-04: mês já lançado não volta, mesmo com o lançamento apagado ou mexido no banco", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    const lancador = app.get(LancamentoMensalService);
    const { body } = await api
      .post("/gastos/contratos", contrato(quadra.id, { diaPagamento: 1 }), token)
      .expect(201);
    expect(body.lancados).toBe(1);
    expect(await prisma.contratoQuadra.findUnique({ where: { id: body.id } })).toMatchObject({
      lancadoAte: paraDataDoBanco(`${mesAtual()}-01`),
    });

    // Correção feita à mão no banco, passando por cima da trava do livro-razão.
    await prisma.$transaction([
      prisma.$executeRaw`ALTER TABLE "Lancamento" DISABLE TRIGGER "Lancamento_sem_update_delete"`,
      prisma.$executeRaw`DELETE FROM "Lancamento" WHERE "origemId" = ${`${body.id}:${mesAtual()}`}`,
      prisma.$executeRaw`ALTER TABLE "Lancamento" ENABLE TRIGGER "Lancamento_sem_update_delete"`,
    ]);

    expect(await lancador.lancar(new Date(), body.id)).toBe(0);
    const doContrato = () =>
      prisma.lancamento.findMany({
        where: { categoria: "ALUGUEL_MENSAL", origemId: { startsWith: `${body.id}:` } },
      });
    expect(await doContrato()).toEqual([]);

    // O mês seguinte entra normalmente no dia do pagamento.
    const mesQueVem = proximaCompetencia(mesAtual());
    await lancador.lancar(new Date(`${vencimentoEm(mesQueVem, 1)}T15:00:00Z`), body.id);
    expect((await doContrato()).map((l) => l.origemId)).toEqual([`${body.id}:${mesQueVem}`]);
  });

  it("GASTO-CA-05: locação avulsa e outros gastos lançam a saída; data futura e valor fora da faixa são recusados", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    const locacao = await api
      .post(
        "/gastos/locacoes",
        {
          quadraId: quadra.id,
          data: somarDias(hoje(), -1),
          valorCentavos: 12000,
          forma: "DINHEIRO",
          observacao: "Treino extra",
        },
        token,
      )
      .expect(201);
    expect(await prisma.lancamento.findUnique({ where: { id: locacao.body.id } })).toMatchObject({
      tipo: "SAIDA",
      categoria: "LOCACAO_AVULSA",
      valorCentavos: 12000,
      forma: "DINHEIRO",
      data: paraDataDoBanco(somarDias(hoje(), -1)),
      descricao: `Locação avulsa: ${quadra.nome}, Treino extra`,
      origemTipo: "Quadra",
      origemId: quadra.id,
    });

    const ids: string[] = [];
    for (const categoria of ["EQUIPAMENTO", "INVESTIMENTO", "OUTRO_GASTO"]) {
      const criado = await api
        .post("/gastos", gasto({ categoria, descricao: `Gasto ${categoria}` }), token)
        .expect(201);
      ids.push(criado.body.id);
    }
    const saidas = (await api.get(`/gastos?competencia=${mesAtual()}`, token).expect(200)).body
      .saidas as { id: string; categoria: string; tipo: string }[];
    for (const id of ids) expect(saidas.some((s) => s.id === id)).toBe(true);

    for (const errado of [
      gasto({ data: somarDias(hoje(), 1) }),
      gasto({ valorCentavos: 0 }),
      gasto({ valorCentavos: 10_000_001 }),
      gasto({ descricao: "ab" }),
      gasto({ categoria: "MENSALIDADE" }),
      gasto({ data: "2026-02-30" }),
    ]) {
      const resposta = await api.post("/gastos", errado, token);
      expect(resposta.status, JSON.stringify(errado)).toBe(400);
    }
    await api
      .post(
        "/gastos/locacoes",
        { quadraId: quadra.id, data: somarDias(hoje(), 1), valorCentavos: 100, forma: "PIX" },
        token,
      )
      .expect(400);
  });

  it("GASTO-CA-06: estorno com motivo lança o contrário ligado ao original; estornar de novo é recusado", async () => {
    const { api, token, usuario } = admin;
    const criado = await api.post("/gastos", gasto({ valorCentavos: 7000 }), token).expect(201);
    await api.post(`/gastos/${criado.body.id}/estorno`, {}, token).expect(400);
    const estorno = await api
      .post(`/gastos/${criado.body.id}/estorno`, { motivo: "Lançado em dobro" }, token)
      .expect(201);
    expect(await prisma.lancamento.findUnique({ where: { id: estorno.body.id } })).toMatchObject({
      tipo: "ENTRADA",
      categoria: "EQUIPAMENTO",
      valorCentavos: 7000,
      forma: "PIX",
      data: paraDataDoBanco(hoje()),
      descricao: "Estorno: Lançado em dobro",
      estornoDeId: criado.body.id,
    });
    await api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "De novo" }, token).expect(409);
    // O estorno não se estorna, e mensalidade se estorna pelo recibo.
    await api.post(`/gastos/${estorno.body.id}/estorno`, { motivo: "Volta" }, token).expect(400);
    const alunoId = await criarAluno(api, token);
    const mensalidade = await mensalidadeNoPassado(
      app,
      alunoId,
      await criarPlano(api, token),
      usuario.id,
      mesesAtras(1),
      15000,
    );
    const pago = await api
      .post(`/mensalidades/${mensalidade}/pagamentos`, { forma: "PIX", data: hoje() }, token)
      .expect(201);
    const pagamento = await prisma.pagamento.findUniqueOrThrow({ where: { id: pago.body.id } });
    await api
      .post(`/gastos/${pagamento.lancamentoId}/estorno`, { motivo: "Não pode" }, token)
      .expect(400);

    // Dois estornos ao mesmo tempo: só um entra.
    const outro = await api.post("/gastos", gasto({ valorCentavos: 3000 }), token).expect(201);
    const respostas = await Promise.all(
      [1, 2].map(() => api.post(`/gastos/${outro.body.id}/estorno`, { motivo: "Engano" }, token)),
    );
    expect(respostas.map((r) => r.status).toSorted((x, y) => x - y)).toEqual([201, 409]);

    const saidas = (await api.get("/gastos", token).expect(200)).body.saidas as {
      id: string;
      estorno: { id: string } | null;
    }[];
    expect(saidas.find((s) => s.id === criado.body.id)?.estorno?.id).toBe(estorno.body.id);
  });

  it("GASTO-CA-07: saldo em caixa é o saldo inicial mais as entradas menos as saídas a partir dele", async () => {
    const { api, token } = admin;
    const antes = (await api.get("/gastos/saldo", token).expect(200)).body;
    if (antes.saldoInicial === null) {
      await api
        .post("/gastos/saldo-inicial", { data: hoje(), valorCentavos: 60000 }, token)
        .expect(201);
    }
    await api
      .post("/gastos/saldo-inicial", { data: hoje(), valorCentavos: 100 }, token)
      .expect(409);
    const comInicial = (await api.get("/gastos/saldo", token).expect(200)).body;
    expect(comInicial.saldoInicial).toEqual({
      valorCentavos: expect.any(Number),
      data: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    if (antes.saldoInicial === null) {
      expect(comInicial.saldoInicial).toEqual({ valorCentavos: 60000, data: hoje() });
    }

    // A soma direta do livro-razão a partir do saldo inicial bate com o saldo.
    const desde = paraDataDoBanco(comInicial.saldoInicial.data);
    const somas = await prisma.lancamento.groupBy({
      by: ["tipo"],
      where: { data: { gte: desde } },
      _sum: { valorCentavos: true },
    });
    const soma = (tipo: string) => somas.find((s) => s.tipo === tipo)?._sum.valorCentavos ?? 0;
    expect(comInicial.saldoCentavos).toBe(soma("ENTRADA") - soma("SAIDA"));

    const criado = await api.post("/gastos", gasto({ valorCentavos: 4500 }), token).expect(201);
    const depoisDoGasto = (await api.get("/gastos/saldo", token).expect(200)).body;
    expect(depoisDoGasto.saldoCentavos).toBe(comInicial.saldoCentavos - 4500);
    await api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "Devolvido" }, token).expect(201);
    expect((await api.get("/gastos/saldo", token).expect(200)).body.saldoCentavos).toBe(
      comInicial.saldoCentavos,
    );
  });

  it("GASTO-CA-08: o Contábil mostra gastos por tipo, resultado, saldo em caixa e comparativo, conferindo com o livro-razão", async () => {
    const { api, token } = admin;
    const quadra = await novaQuadra();
    const antes = await painel();
    await api
      .post(
        "/gastos/locacoes",
        { quadraId: quadra.id, data: hoje(), valorCentavos: 6000, forma: "PIX" },
        token,
      )
      .expect(201);
    await api
      .post("/gastos", gasto({ categoria: "INVESTIMENTO", valorCentavos: 2000 }), token)
      .expect(201);
    const depois = await painel();
    expect(depois.gastos["LOCACAO_AVULSA"]! - antes.gastos["LOCACAO_AVULSA"]!).toBe(6000);
    expect(depois.gastos["INVESTIMENTO"]! - antes.gastos["INVESTIMENTO"]!).toBe(2000);
    expect(depois.totalGastos - antes.totalGastos).toBe(8000);
    expect(depois.resultado - antes.resultado).toBe(-8000);
    expect(depois.resultado).toBe(
      depois.recebido - depois.estornos + depois.outrasReceitas - depois.totalGastos,
    );
    expect(depois.resultado + depois.saldoInicial + depois.aportes + depois.naoClassificado).toBe(
      depois.entradas - depois.saidas,
    );
    expect(depois.naoClassificado).toBe(0);
    expect(depois.confere).toBe(true);
    expect(depois.caixa.saldoCentavos - antes.caixa.saldoCentavos).toBe(-8000);
    expect(depois.caixa).toEqual((await api.get("/gastos/saldo", token).expect(200)).body);
    expect(depois.comparativo.at(-1)).toMatchObject({
      competencia: mesAtual(),
      gastos: depois.totalGastos,
      resultado: depois.resultado,
    });
    // O saldo inicial não é receita.
    expect(depois.recebido).toBe(
      (
        await prisma.lancamento.aggregate({
          where: {
            categoria: "MENSALIDADE",
            data: {
              gte: paraDataDoBanco(`${mesAtual()}-01`),
              lte: paraDataDoBanco(somarDias(`${proximaCompetencia(mesAtual())}-01`, -1)),
            },
          },
          _sum: { valorCentavos: true },
        })
      )._sum.valorCentavos ?? 0,
    );
  });

  it("GASTO-CA-09: o atendente não cadastra nem vê contratos, gastos, saldo nem Contábil", async () => {
    const quadra = await novaQuadra();
    const criado = await admin.api.post("/gastos", gasto(), admin.token).expect(201);
    const { api, token } = await logado(app, "ATENDENTE");
    const tentativas = await Promise.all([
      api.get("/gastos", token),
      api.post("/gastos", gasto(), token),
      api.post(
        "/gastos/locacoes",
        { quadraId: quadra.id, data: hoje(), valorCentavos: 100, forma: "PIX" },
        token,
      ),
      api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "Tentativa" }, token),
      api.get("/gastos/contratos", token),
      api.post("/gastos/contratos", contrato(quadra.id), token),
      api.get("/gastos/saldo", token),
      api.post("/gastos/saldo-inicial", { data: hoje(), valorCentavos: 100 }, token),
      api.get("/contabil/painel", token),
      api.post("/horarios/quadras", { nome: unico("Quadra") }, token),
      api.patch(`/horarios/quadras/${quadra.id}`, { nome: "Outra", ativa: false }, token),
    ]);
    for (const resposta of tentativas) expect(resposta.status).toBe(403);
    // A agenda de cada quadra ele vê.
    await api.get("/horarios/quadras", token).expect(200);
    await api.get(`/horarios/grade?quadra=${quadra.id}`, token).expect(200);
  });

  it("GASTO-CA-10: quadras, contratos, locações, gastos e estornos ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const quadra = (
      await api.post("/horarios/quadras", { nome: unico("Quadra") }, token).expect(201)
    ).body;
    await api
      .patch(`/horarios/quadras/${quadra.id}`, { nome: unico("Arena"), ativa: true }, token)
      .expect(200);
    const registrado = await api
      .post(
        "/gastos/contratos",
        contrato(quadra.id, { inicio: proximaCompetencia(mesAtual()), diaPagamento: 5 }),
        token,
      )
      .expect(201);
    await api
      .post(
        `/gastos/contratos/${registrado.body.id}/encerrar`,
        { fim: proximaCompetencia(proximaCompetencia(mesAtual())) },
        token,
      )
      .expect(201);
    await api
      .post(
        "/gastos/locacoes",
        { quadraId: quadra.id, data: hoje(), valorCentavos: 100, forma: "PIX" },
        token,
      )
      .expect(201);
    const criado = await api.post("/gastos", gasto({ valorCentavos: 100 }), token).expect(201);
    await api.post(`/gastos/${criado.body.id}/estorno`, { motivo: "Engano" }, token).expect(201);

    const registros = await prisma.auditoria.findMany({
      where: { atorId: usuario.id, acao: { not: "LOGIN_SUCESSO" } },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "QUADRA_CRIADA",
      "QUADRA_ALTERADA",
      "CONTRATO_REGISTRADO",
      "CONTRATO_ENCERRADO",
      "GASTO_REGISTRADO",
      "GASTO_REGISTRADO",
      "LANCAMENTO_ESTORNADO",
    ]);
    for (const r of registros) {
      expect(r.ip).toBeTruthy();
      expect(r.criadaEm).toBeInstanceOf(Date);
    }
  });
});
