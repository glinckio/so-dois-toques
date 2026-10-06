import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { primeiroDia } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { type Api, criarAluno, criarLocal, logado } from "./apoio-aulas.js";
import { assinar, criarPlano, proximoMes } from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());

describe("Etapa 5: abertura, fechamento e avulsos do caixa", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
  });

  // Só pode haver um caixa aberto: cada teste começa e termina sem nenhum.
  async function fecharSeAberto() {
    const { api, token } = admin;
    const atual = await api.get("/caixa/sessao", token).expect(200);
    const turno = atual.body.turno;
    if (!turno) return;
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

  beforeEach(fecharSeAberto);

  afterAll(async () => {
    await fecharSeAberto();
    await app.close();
  });

  async function abrir(troco = 10000, quem: { api: Api; token: string } = admin) {
    const resposta = await quem.api
      .post("/caixa/sessoes", { trocoInicialCentavos: troco }, quem.token)
      .expect(201);
    return resposta.body.id as string;
  }

  async function avulso(
    categoria: string,
    valorCentavos: number,
    forma = "DINHEIRO",
    quem: { api: Api; token: string } = admin,
  ) {
    const resposta = await quem.api
      .post(
        "/caixa/avulsos",
        { categoria, forma, valorCentavos, descricao: `Teste ${categoria}` },
        quem.token,
      )
      .expect(201);
    return resposta.body.id as string;
  }

  /** Mensalidade do mês que vem paga hoje; devolve o lançamento e o pagamento. */
  async function mensalidadePaga(valorCentavos = 15000, forma = "DINHEIRO") {
    const { api, token } = admin;
    const alunoId = await criarAluno(api, token);
    const planoId = await criarPlano(api, token, { valorCentavos });
    await assinar(api, token, alunoId, planoId, { inicio: proximoMes() });
    await api.post("/mensalidades/geracoes", { competencia: proximoMes() }, token).expect(201);
    const mensalidade = await prisma.mensalidade.findFirstOrThrow({
      where: { alunoId, competencia: paraDataDoBanco(primeiroDia(proximoMes())) },
    });
    const pago = await api
      .post(`/mensalidades/${mensalidade.id}/pagamentos`, { forma, data: hoje() }, token)
      .expect(201);
    const pagamento = await prisma.pagamento.findUniqueOrThrow({ where: { id: pago.body.id } });
    return { pagamentoId: pagamento.id, lancamentoId: pagamento.lancamentoId };
  }

  it("CAIXA-CA-01: abre com troco e nunca há dois caixas abertos, mesmo com aberturas simultâneas", async () => {
    const { api, token, usuario } = admin;
    for (const invalido of [-1, 1_000_001, 10.5, "100"]) {
      await api.post("/caixa/sessoes", { trocoInicialCentavos: invalido }, token).expect(400);
    }
    const respostas = await Promise.all([
      api.post("/caixa/sessoes", { trocoInicialCentavos: 5000 }, token),
      api.post("/caixa/sessoes", { trocoInicialCentavos: 5000 }, token),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    await api.post("/caixa/sessoes", { trocoInicialCentavos: 0 }, token).expect(409);

    const atual = await api.get("/caixa/sessao", token).expect(200);
    expect(atual.body.turno).toMatchObject({
      trocoInicialCentavos: 5000,
      abertaPor: usuario.nome,
      fechadaEm: null,
      esperadoDinheiroCentavos: 5000,
    });
    expect(await prisma.sessaoCaixa.count({ where: { fechadaEm: null } })).toBe(1);
  });

  it("CAIXA-CA-02: lança suprimento, sangria, despesa e receita avulsa com caixa aberto e recusa o inválido", async () => {
    const { api, token } = admin;
    const base = { categoria: "DESPESA", forma: "PIX", valorCentavos: 1000, descricao: "Material" };
    await api.post("/caixa/avulsos", base, token).expect(409);

    const turno = await abrir();
    const tipos = {
      SUPRIMENTO: "ENTRADA",
      SANGRIA: "SAIDA",
      DESPESA: "SAIDA",
      RECEITA_AVULSA: "ENTRADA",
    } as const;
    for (const [categoria, tipo] of Object.entries(tipos)) {
      const id = await avulso(categoria, 1234);
      expect(await prisma.lancamento.findUniqueOrThrow({ where: { id } })).toMatchObject({
        tipo,
        categoria,
        valorCentavos: 1234,
        forma: "DINHEIRO",
        data: paraDataDoBanco(hoje()),
        sessaoId: turno,
        descricao: `Teste ${categoria}`,
      });
    }
    await avulso("DESPESA", 999, "CARTAO_DEBITO");
    await avulso("RECEITA_AVULSA", 999, "PIX");

    const antes = await prisma.lancamento.count();
    for (const invalido of [
      { categoria: "SUPRIMENTO", forma: "PIX" },
      { categoria: "SANGRIA", forma: "CARTAO_CREDITO" },
      { categoria: "MENSALIDADE" },
      { categoria: "ESTORNO" },
      { valorCentavos: 0 },
      { valorCentavos: 10_000_001 },
      { valorCentavos: 1.5 },
      { descricao: "ab" },
      { forma: "CHEQUE" },
    ]) {
      await api.post("/caixa/avulsos", { ...base, ...invalido }, token).expect(400);
    }
    expect(await prisma.lancamento.count()).toBe(antes);
  });

  it("CAIXA-CA-03: lançamentos feitos com o caixa aberto ficam no turno; com ele fechado, ficam sem turno", async () => {
    const { api, token } = admin;
    const turno = await abrir();
    const mensalidade = await mensalidadePaga();
    await api
      .post(`/pagamentos/${mensalidade.pagamentoId}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    const localId = await criarLocal(api, token);
    const quadra = await api
      .post(
        "/custos/pagamentos",
        {
          localId,
          competencia: hoje().slice(0, 7),
          valorCentavos: 5000,
          forma: "PIX",
          data: hoje(),
        },
        token,
      )
      .expect(201);
    await api
      .post(`/custos/pagamentos/${quadra.body.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    const despesa = await avulso("DESPESA", 700);
    await api.post(`/caixa/avulsos/${despesa}/estornar`, { motivo: "Engano" }, token).expect(200);

    const doTurno = await prisma.lancamento.findMany({ where: { sessaoId: turno } });
    expect(doTurno.map((l) => l.categoria).sort()).toEqual(
      ["DESPESA", "ESTORNO", "ESTORNO", "ESTORNO", "MENSALIDADE", "QUADRA_PARCEIRA"].sort(),
    );

    await fecharSeAberto();
    const fora = await mensalidadePaga();
    expect(
      (await prisma.lancamento.findUniqueOrThrow({ where: { id: fora.lancamentoId } })).sessaoId,
    ).toBeNull();
  });

  it("CAIXA-CA-04: fecha com esperado e diferença; diferença exige observação; turno fechado não muda", async () => {
    const { api, token, usuario } = admin;
    const turno = await abrir(10000);
    await mensalidadePaga(15000, "DINHEIRO");
    await mensalidadePaga(9000, "PIX");
    await avulso("RECEITA_AVULSA", 5000, "PIX");
    await avulso("SANGRIA", 3000);
    await avulso("DESPESA", 1000);
    await avulso("SUPRIMENTO", 2000);
    const esperado = 10000 + 15000 - 3000 - 1000 + 2000;

    const atual = await api.get("/caixa/sessao", token).expect(200);
    expect(atual.body.turno.esperadoDinheiroCentavos).toBe(esperado);

    const rota = `/caixa/sessoes/${turno}/fechar`;
    await api.post(rota, { contadoDinheiroCentavos: esperado - 1000 }, token).expect(400);
    await api.post(rota, { contadoDinheiroCentavos: -1 }, token).expect(400);
    const respostas = await Promise.all([
      api.post(
        rota,
        { contadoDinheiroCentavos: esperado - 1000, observacao: "Faltou troco" },
        token,
      ),
      api.post(
        rota,
        { contadoDinheiroCentavos: esperado - 1000, observacao: "Faltou troco" },
        token,
      ),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(respostas.find((r) => r.status === 200)?.body).toMatchObject({
      esperadoDinheiroCentavos: esperado,
      diferencaCentavos: -1000,
    });
    const fechado = await prisma.sessaoCaixa.findUniqueOrThrow({ where: { id: turno } });
    expect(fechado).toMatchObject({
      fechadaPorId: usuario.id,
      esperadoDinheiroCentavos: esperado,
      contadoDinheiroCentavos: esperado - 1000,
      diferencaCentavos: -1000,
      observacao: "Faltou troco",
    });
    expect((await api.get("/caixa/sessao", token).expect(200)).body.turno).toBeNull();

    await api
      .post(
        "/caixa/avulsos",
        { categoria: "DESPESA", forma: "PIX", valorCentavos: 100, descricao: "Depois" },
        token,
      )
      .expect(409);
    await api.post(rota, { contadoDinheiroCentavos: esperado }, token).expect(409);
    // O banco também não deixa mexer no turno fechado nem apagar turno.
    await expect(
      prisma.sessaoCaixa.update({ where: { id: turno }, data: { observacao: "Mudou" } }),
    ).rejects.toThrow();
    await expect(prisma.sessaoCaixa.delete({ where: { id: turno } })).rejects.toThrow();

    // Contado igual ao esperado não precisa de observação.
    const outro = await abrir(500);
    await api
      .post(`/caixa/sessoes/${outro}/fechar`, { contadoDinheiroCentavos: 500 }, token)
      .expect(200);
    await api
      .post(
        "/caixa/sessoes/00000000-0000-4000-8000-000000000000/fechar",
        { contadoDinheiroCentavos: 0 },
        token,
      )
      .expect(404);
  });

  it("CAIXA-CA-05: relatório do turno com totais por forma e categoria; turnos mais recentes primeiro", async () => {
    const { api, token, usuario } = admin;
    const primeiro = await abrir(1000);
    await fecharSeAberto();
    const turno = await abrir(2000);
    await mensalidadePaga(15000, "DINHEIRO");
    await avulso("DESPESA", 1500, "PIX");
    await avulso("SANGRIA", 500);
    await api
      .post(`/caixa/sessoes/${turno}/fechar`, { contadoDinheiroCentavos: 16500 }, token)
      .expect(200);

    const relatorio = await api.get(`/caixa/sessoes/${turno}`, token).expect(200);
    expect(relatorio.body).toMatchObject({
      id: turno,
      abertaPor: usuario.nome,
      fechadaPor: usuario.nome,
      trocoInicialCentavos: 2000,
      esperadoDinheiroCentavos: 16500,
      contadoDinheiroCentavos: 16500,
      diferencaCentavos: 0,
    });
    expect(relatorio.body.resumo).toMatchObject({ entradas: 15000, saidas: 2000, saldo: 13000 });
    expect(relatorio.body.resumo.porForma.DINHEIRO).toEqual({
      entradas: 15000,
      saidas: 500,
      saldo: 14500,
    });
    expect(relatorio.body.porCategoria).toEqual(
      expect.arrayContaining([
        { categoria: "MENSALIDADE", entradas: 15000, saidas: 0 },
        { categoria: "DESPESA", entradas: 0, saidas: 1500 },
        { categoria: "SANGRIA", entradas: 0, saidas: 500 },
      ]),
    );
    expect(relatorio.body.lancamentos).toHaveLength(3);

    const lista = await api.get("/caixa/sessoes", token).expect(200);
    const ids = lista.body.map((t: { id: string }) => t.id);
    expect(ids.indexOf(turno)).toBeLessThan(ids.indexOf(primeiro));
    expect(lista.body[ids.indexOf(turno)]).toMatchObject({
      diferencaCentavos: 0,
      fechadaPor: usuario.nome,
    });
    await api.get("/caixa/sessoes/00000000-0000-4000-8000-000000000000", token).expect(404);
  });

  it("CAIXA-CA-06: administrador estorna avulso com motivo; estornar de novo ou o que não é avulso é recusado", async () => {
    const { api, token } = admin;
    const turno = await abrir();
    const despesa = await avulso("DESPESA", 2500, "PIX");
    const mensalidade = await mensalidadePaga();

    await api.post(`/caixa/avulsos/${despesa}/estornar`, {}, token).expect(400);
    const respostas = await Promise.all([
      api.post(`/caixa/avulsos/${despesa}/estornar`, { motivo: "Lançado em dobro" }, token),
      api.post(`/caixa/avulsos/${despesa}/estornar`, { motivo: "Lançado em dobro" }, token),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const estornos = await prisma.lancamento.findMany({ where: { estornoDeId: despesa } });
    expect(estornos).toHaveLength(1);
    expect(estornos[0]).toMatchObject({
      tipo: "ENTRADA",
      valorCentavos: 2500,
      forma: "PIX",
      categoria: "ESTORNO",
      sessaoId: turno,
    });
    await api
      .post(`/caixa/avulsos/${mensalidade.lancamentoId}/estornar`, { motivo: "Não pode" }, token)
      .expect(400);
    await api
      .post(
        "/caixa/avulsos/00000000-0000-4000-8000-000000000000/estornar",
        { motivo: "Nada" },
        token,
      )
      .expect(404);

    const outra = await avulso("RECEITA_AVULSA", 800);
    await fecharSeAberto();
    await api.post(`/caixa/avulsos/${outra}/estornar`, { motivo: "Sem caixa" }, token).expect(409);

    const caixa = await api.get(`/caixa/lancamentos?data=${hoje()}`, token).expect(200);
    expect(caixa.body.lancamentos).toContainEqual(
      expect.objectContaining({ id: despesa, estornado: true, sessaoId: turno }),
    );
  });

  it("CAIXA-CA-07: atendente abre, lança e fecha, mas não estorna; professor não acessa", async () => {
    const atendente = await logado(app, "ATENDENTE");
    const turno = await abrir(3000, atendente);
    const despesa = await avulso("DESPESA", 400, "DINHEIRO", atendente);
    await atendente.api.get("/caixa/sessao", atendente.token).expect(200);
    await atendente.api.get("/caixa/sessoes", atendente.token).expect(200);
    await atendente.api.get(`/caixa/sessoes/${turno}`, atendente.token).expect(200);
    await atendente.api
      .post(`/caixa/avulsos/${despesa}/estornar`, { motivo: "Teste" }, atendente.token)
      .expect(403);

    const professor = await logado(app, "PROFESSOR");
    await professor.api.get("/caixa/sessao", professor.token).expect(403);
    await professor.api.get("/caixa/sessoes", professor.token).expect(403);
    await professor.api.get(`/caixa/sessoes/${turno}`, professor.token).expect(403);
    await professor.api
      .post(
        "/caixa/avulsos",
        { categoria: "DESPESA", forma: "PIX", valorCentavos: 100, descricao: "Teste" },
        professor.token,
      )
      .expect(403);
    await professor.api
      .post(`/caixa/sessoes/${turno}/fechar`, { contadoDinheiroCentavos: 2600 }, professor.token)
      .expect(403);
    await professor.api
      .post("/caixa/sessoes", { trocoInicialCentavos: 0 }, professor.token)
      .expect(403);

    await atendente.api
      .post(`/caixa/sessoes/${turno}/fechar`, { contadoDinheiroCentavos: 2600 }, atendente.token)
      .expect(200);
    expect(
      (await prisma.sessaoCaixa.findUniqueOrThrow({ where: { id: turno } })).fechadaPorId,
    ).toBe(atendente.usuario.id);
    expect(await prisma.lancamento.count({ where: { estornoDeId: despesa } })).toBe(0);
  });

  it("CAIXA-CA-08: abertura, fechamento, avulso e estorno ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = admin;
    const turno = await abrir(1000);
    const despesa = await avulso("DESPESA", 300, "PIX");
    await api.post(`/caixa/avulsos/${despesa}/estornar`, { motivo: "Engano" }, token).expect(200);
    await api
      .post(`/caixa/sessoes/${turno}/fechar`, { contadoDinheiroCentavos: 1000 }, token)
      .expect(200);

    const registros = await prisma.auditoria.findMany({
      where: { OR: [{ alvoId: turno }, { alvoId: despesa }] },
      orderBy: { criadaEm: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "CAIXA_ABERTO",
      "LANCAMENTO_AVULSO_REGISTRADO",
      "LANCAMENTO_AVULSO_ESTORNADO",
      "CAIXA_FECHADO",
    ]);
    for (const registro of registros) {
      expect(registro.atorId).toBe(usuario.id);
      expect(registro.ip).toBeTruthy();
      expect(registro.criadaEm).toBeInstanceOf(Date);
    }
    expect(registros[3]?.detalhes).toMatchObject({
      esperadoDinheiroCentavos: 1000,
      contadoDinheiroCentavos: 1000,
      diferencaCentavos: 0,
    });
    expect(registros[2]?.detalhes).toMatchObject({ motivo: "Engano", valorCentavos: 300 });
  });
});
