import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { custoPrevisto, minutosDaTurmaNoMes } from "../src/custos/regras.js";
import { primeiroDia, proximaCompetencia } from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp, criarUsuario } from "./apoio.js";
import { criarAluno, criarLocal, criarTurma, logado, todosOsDias, unico } from "./apoio-aulas.js";
import { assinar, criarPlano, mesAtual, mesesAtras, proximoMes } from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());
const amanha = () => hojeEmSaoPaulo(new Date(Date.now() + 24 * 60 * 60 * 1000));

type Linha = { receitaCentavos: number; custoCentavos: number; resultadoCentavos: number };
type Resultado = {
  turmas: (Linha & { id: string; nome: string; professor: { id: string } })[];
  semTurma: Linha;
  professores: (Linha & { id: string; turmas: number })[];
  totais: Linha;
};

describe("Etapa 4: horas e custos das quadras parceiras", () => {
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

  async function localComValor(valorHoraCentavos = 6000) {
    const { api, token } = admin;
    const localId = await criarLocal(api, token);
    await api.put(`/locais/${localId}/valor-hora`, { valorHoraCentavos }, token).expect(200);
    return localId;
  }

  async function novoProfessor() {
    return (await criarUsuario(app, "PROFESSOR")).id;
  }

  async function pagarQuadra(localId: string, valorCentavos: number, extra = {}) {
    const { api, token } = admin;
    const resposta = await api
      .post(
        "/custos/pagamentos",
        { localId, competencia: mesAtual(), valorCentavos, forma: "PIX", data: hoje(), ...extra },
        token,
      )
      .expect(201);
    return resposta.body as { id: string; lancamentoId: string };
  }

  /** Aluno com a mensalidade do mês atual paga hoje; devolve o id do pagamento. */
  async function alunoPagante(valorCentavos: number, turmas: string[]) {
    const { api, token } = admin;
    const alunoId = await criarAluno(api, token);
    for (const turmaId of turmas) {
      await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
    }
    const planoId = await criarPlano(api, token, { valorCentavos });
    await assinar(api, token, alunoId, planoId, { inicio: mesAtual() });
    await api.post("/mensalidades/geracoes", { competencia: mesAtual() }, token).expect(201);
    const mensalidade = await prisma.mensalidade.findFirstOrThrow({
      where: { alunoId, competencia: paraDataDoBanco(primeiroDia(mesAtual())) },
    });
    const pago = await api
      .post(`/mensalidades/${mensalidade.id}/pagamentos`, { forma: "PIX", data: hoje() }, token)
      .expect(201);
    return pago.body.id as string;
  }

  async function resultado(competencia = mesAtual()): Promise<Resultado> {
    const { api, token } = admin;
    return (await api.get(`/custos/resultado?competencia=${competencia}`, token).expect(200)).body;
  }

  describe("valor da hora e horas do mês", () => {
    it("CUSTO-CA-01: define e apaga o valor da hora de local parceiro; faixa e local próprio são recusados", async () => {
      const { api, token } = admin;
      const localId = await criarLocal(api, token);
      const rota = `/locais/${localId}/valor-hora`;

      await api.put(rota, { valorHoraCentavos: 8000 }, token).expect(200);
      let locais = await api.get("/locais", token).expect(200);
      expect(locais.body).toContainEqual(
        expect.objectContaining({ id: localId, valorHoraCentavos: 8000 }),
      );
      for (const invalido of [99, 200_001, 80.5, "80"]) {
        await api.put(rota, { valorHoraCentavos: invalido }, token).expect(400);
      }
      await api.put(rota, { valorHoraCentavos: null }, token).expect(200);
      locais = await api.get("/locais", token).expect(200);
      expect(locais.body).toContainEqual(
        expect.objectContaining({ id: localId, valorHoraCentavos: null }),
      );

      const propria = await api
        .post("/locais", { nome: unico("Arena própria"), tipo: "PROPRIA" }, token)
        .expect(201);
      await api
        .put(`/locais/${propria.body.id}/valor-hora`, { valorHoraCentavos: 8000 }, token)
        .expect(400);
      // O banco também recusa valor em local próprio.
      await expect(
        prisma.local.update({ where: { id: propria.body.id }, data: { valorHoraCentavos: 8000 } }),
      ).rejects.toThrow();

      // Virar local próprio apaga o valor da hora.
      await api.put(rota, { valorHoraCentavos: 8000 }, token).expect(200);
      const local = await prisma.local.findUniqueOrThrow({ where: { id: localId } });
      await api
        .patch(`/locais/${localId}`, { nome: local.nome, tipo: "PROPRIA", ativo: true }, token)
        .expect(200);
      expect(
        (await prisma.local.findUniqueOrThrow({ where: { id: localId } })).valorHoraCentavos,
      ).toBeNull();
    });

    it("CUSTO-CA-02: soma as horas das turmas do local no mês e calcula o custo previsto", async () => {
      const { api, token } = admin;
      const localId = await localComValor(6000);
      const professorId = await novoProfessor();
      const turmaUma = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(7 * 60, 8 * 60),
      });
      const turmaDuas = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(9 * 60, 11 * 60),
      });
      // Encerrada no dia em que começou: não tem nenhuma aula.
      const encerrada = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(12 * 60, 13 * 60),
      });
      await api.post(`/turmas/${encerrada}/encerrar`, {}, token).expect(200);

      const esperado = (competencia: string) =>
        minutosDaTurmaNoMes(
          { horarios: todosOsDias(7 * 60, 8 * 60), inicio: hoje(), encerradaEm: null },
          competencia,
        ) * 3;

      for (const competencia of [mesAtual(), proximoMes(), mesesAtras(1)]) {
        const resposta = await api.get(`/custos?competencia=${competencia}`, token).expect(200);
        const local = resposta.body.locais.find((l: { id: string }) => l.id === localId);
        expect(local).toMatchObject({
          valorHoraCentavos: 6000,
          minutos: esperado(competencia),
          previstoCentavos: custoPrevisto(esperado(competencia), 6000),
          pagoCentavos: 0,
        });
        const turmas = local.turmas.map((t: { id: string }) => t.id);
        expect(turmas).not.toContain(encerrada);
        if (esperado(competencia) > 0)
          expect(new Set(turmas)).toEqual(new Set([turmaUma, turmaDuas]));
      }
      // O mês que vem tem todos os dias com aula: 3 horas por dia.
      const [ano, mes] = proximoMes().split("-").map(Number) as [number, number];
      const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      expect(esperado(proximoMes())).toBe(dias * 180);
      expect(esperado(mesesAtras(1))).toBe(0);

      await api.get("/custos?competencia=2026-13", token).expect(400);
    });
  });

  describe("pagamento à quadra", () => {
    it("CUSTO-CA-03: registra o pagamento e o lançamento de saída na mesma transação; recusa data futura, local próprio e mês inválido", async () => {
      const { api, token, usuario } = admin;
      const localId = await localComValor();
      const local = await prisma.local.findUniqueOrThrow({ where: { id: localId } });

      const pago = await pagarQuadra(localId, 12345, { forma: "DINHEIRO" });
      const lancamento = await prisma.lancamento.findUniqueOrThrow({
        where: { id: pago.lancamentoId },
      });
      expect(lancamento).toMatchObject({
        tipo: "SAIDA",
        valorCentavos: 12345,
        forma: "DINHEIRO",
        data: paraDataDoBanco(hoje()),
        categoria: "QUADRA_PARCEIRA",
        origemTipo: "PagamentoQuadra",
        origemId: pago.id,
        criadoPorId: usuario.id,
      });
      expect(lancamento.descricao).toBe(
        `Quadra ${local.nome} de ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(paraDataDoBanco(primeiroDia(mesAtual())))}`,
      );

      const resumo = await api.get(`/custos?competencia=${mesAtual()}`, token).expect(200);
      expect(resumo.body.locais.find((l: { id: string }) => l.id === localId)).toMatchObject({
        pagoCentavos: 12345,
        pagamentos: [expect.objectContaining({ id: pago.id, valorCentavos: 12345, data: hoje() })],
      });
      const caixa = await api.get(`/caixa/lancamentos?data=${hoje()}`, token).expect(200);
      expect(caixa.body.lancamentos).toContainEqual(
        expect.objectContaining({ id: pago.lancamentoId, categoria: "QUADRA_PARCEIRA" }),
      );

      const antes = await prisma.lancamento.count();
      const propria = await api
        .post("/locais", { nome: unico("Arena própria"), tipo: "PROPRIA" }, token)
        .expect(201);
      const base = {
        localId,
        competencia: mesAtual(),
        valorCentavos: 5000,
        forma: "PIX",
        data: hoje(),
      };
      for (const invalido of [
        { data: amanha() },
        { localId: propria.body.id },
        { competencia: "2026-13" },
        { competencia: proximaCompetencia(proximoMes()) },
        { valorCentavos: 0 },
        { valorCentavos: 10.5 },
        { forma: "CHEQUE" },
      ]) {
        await api.post("/custos/pagamentos", { ...base, ...invalido }, token).expect(400);
      }
      expect(await prisma.lancamento.count()).toBe(antes);
    });

    it("CUSTO-CA-04: estorna com motivo, com lançamento de entrada ligado ao original; estornar de novo é recusado", async () => {
      const { api, token } = admin;
      const localId = await localComValor();
      const pago = await pagarQuadra(localId, 8000);

      await api.post(`/custos/pagamentos/${pago.id}/estornar`, {}, token).expect(400);
      // Dois estornos ao mesmo tempo: só um passa.
      const respostas = await Promise.all([
        api.post(`/custos/pagamentos/${pago.id}/estornar`, { motivo: "Valor errado" }, token),
        api.post(`/custos/pagamentos/${pago.id}/estornar`, { motivo: "Valor errado" }, token),
      ]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
      await api
        .post(`/custos/pagamentos/${pago.id}/estornar`, { motivo: "De novo" }, token)
        .expect(409);

      const estornos = await prisma.lancamento.findMany({
        where: { estornoDeId: pago.lancamentoId },
      });
      expect(estornos).toHaveLength(1);
      expect(estornos[0]).toMatchObject({
        tipo: "ENTRADA",
        valorCentavos: 8000,
        categoria: "ESTORNO",
        data: paraDataDoBanco(hoje()),
      });
      const pagamento = await prisma.pagamentoQuadra.findUniqueOrThrow({ where: { id: pago.id } });
      expect(pagamento.estornadoEm).not.toBeNull();
      expect(pagamento.motivoEstorno).toBe("Valor errado");
      expect(pagamento.estornoLancamentoId).toBe(estornos[0]?.id);

      const resumo = await api.get(`/custos?competencia=${mesAtual()}`, token).expect(200);
      const local = resumo.body.locais.find((l: { id: string }) => l.id === localId);
      expect(local.pagoCentavos).toBe(0);
      expect(local.pagamentos[0].estornadoEm).not.toBeNull();

      await api
        .post(
          "/custos/pagamentos/00000000-0000-4000-8000-000000000000/estornar",
          { motivo: "Não existe" },
          token,
        )
        .expect(404);
    });
  });

  describe("resultado do mês", () => {
    it("CUSTO-CA-05: divide a receita entre as turmas do aluno e o custo pelas horas; o resto vai para Sem turma", async () => {
      const { api, token } = admin;
      const antes = await resultado();
      const localId = await localComValor(6000);
      const professorId = await novoProfessor();
      // Uma hora por dia contra duas: o custo divide 1 para 2.
      const turmaUma = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(7 * 60, 8 * 60),
      });
      const turmaDuas = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(9 * 60, 11 * 60),
      });

      await alunoPagante(15001, [turmaUma, turmaDuas]);
      const pagamentoSoUma = await alunoPagante(10000, [turmaUma]);
      await alunoPagante(5000, []);
      const quadra = await pagarQuadra(localId, 9000);

      let depois = await resultado();
      const linha = (r: Resultado, id: string) => r.turmas.find((t) => t.id === id);
      const uma = linha(depois, turmaUma);
      const duas = linha(depois, turmaDuas);
      // 15.001 em duas partes iguais: 7.501 e 7.500, conforme a ordem das turmas.
      expect([17500, 17501]).toContain(uma?.receitaCentavos);
      expect((uma?.receitaCentavos ?? 0) + (duas?.receitaCentavos ?? 0)).toBe(25001);
      expect(uma).toMatchObject({ custoCentavos: 3000 });
      expect(duas).toMatchObject({ custoCentavos: 6000 });
      expect(uma?.resultadoCentavos).toBe((uma?.receitaCentavos ?? 0) - 3000);
      expect(depois.semTurma.receitaCentavos - antes.semTurma.receitaCentavos).toBe(5000);

      // Estornos saem da mesma turma de onde a receita e o custo entraram.
      await api
        .post(`/pagamentos/${pagamentoSoUma}/estornar`, { motivo: "Engano" }, token)
        .expect(200);
      await api
        .post(`/custos/pagamentos/${quadra.id}/estornar`, { motivo: "Engano" }, token)
        .expect(200);
      depois = await resultado();
      expect(linha(depois, turmaUma)).toMatchObject({
        receitaCentavos: (uma?.receitaCentavos ?? 0) - 10000,
        custoCentavos: 0,
      });
      expect(linha(depois, turmaDuas)).toMatchObject({ custoCentavos: 0 });

      // Local sem turma com horas: o custo vai para Sem turma.
      const vazio = await localComValor();
      const semTurmaAntes = depois.semTurma.custoCentavos;
      await pagarQuadra(vazio, 4321);
      expect((await resultado()).semTurma.custoCentavos - semTurmaAntes).toBe(4321);
    });

    it("CUSTO-CA-06: receita e custo totais batem ao centavo com os lançamentos do Caixa no mês", async () => {
      const { api, token } = admin;
      const localId = await localComValor(7777);
      const professorId = await novoProfessor();
      const turmas = [
        await criarTurma(api, token, {
          localId,
          professorId,
          horarios: todosOsDias(7 * 60, 8 * 60),
        }),
        await criarTurma(api, token, {
          localId,
          professorId,
          horarios: todosOsDias(9 * 60, 10 * 60 + 10),
        }),
        await criarTurma(api, token, {
          localId,
          professorId,
          horarios: todosOsDias(13 * 60, 13 * 60 + 35),
        }),
      ];
      await alunoPagante(9999, turmas);
      const estornado = await alunoPagante(12345, turmas.slice(1));
      await api.post(`/pagamentos/${estornado}/estornar`, { motivo: "Engano" }, token).expect(200);
      await pagarQuadra(localId, 10001);
      const quadra = await pagarQuadra(localId, 3333);
      await api
        .post(`/custos/pagamentos/${quadra.id}/estornar`, { motivo: "Engano" }, token)
        .expect(200);

      const r = await resultado();
      const lancamentos = await prisma.lancamento.findMany({
        where: {
          data: {
            gte: paraDataDoBanco(primeiroDia(mesAtual())),
            lt: paraDataDoBanco(primeiroDia(proximoMes())),
          },
        },
        include: { estornoDe: { select: { categoria: true } } },
      });
      const soma = (categoria: "MENSALIDADE" | "QUADRA_PARCEIRA") =>
        lancamentos
          .filter((l) => l.categoria === categoria)
          .reduce((s, l) => s + l.valorCentavos, 0) -
        lancamentos
          .filter((l) => l.categoria === "ESTORNO" && l.estornoDe?.categoria === categoria)
          .reduce((s, l) => s + l.valorCentavos, 0);

      expect(r.totais).toEqual({
        receitaCentavos: soma("MENSALIDADE"),
        custoCentavos: soma("QUADRA_PARCEIRA"),
        resultadoCentavos: soma("MENSALIDADE") - soma("QUADRA_PARCEIRA"),
      });
      const somaDasLinhas = (campo: keyof Linha) =>
        r.turmas.reduce((s, t) => s + t[campo], 0) + r.semTurma[campo];
      expect(somaDasLinhas("receitaCentavos")).toBe(r.totais.receitaCentavos);
      expect(somaDasLinhas("custoCentavos")).toBe(r.totais.custoCentavos);
      const destas = r.turmas.filter((t) => turmas.includes(t.id));
      expect(destas.reduce((s, t) => s + t.receitaCentavos, 0)).toBe(9999);
      expect(destas.reduce((s, t) => s + t.custoCentavos, 0)).toBe(10001);

      // Mês sem nada lançado.
      const vazio = await resultado("2001-01");
      expect(vazio.totais).toEqual({ receitaCentavos: 0, custoCentavos: 0, resultadoCentavos: 0 });
      await admin.api.get("/custos/resultado?competencia=2026-1", token).expect(400);
    });

    it("CUSTO-CA-07: o resultado do professor soma as turmas dele", async () => {
      const { api, token } = admin;
      const localId = await localComValor(6000);
      const professorId = await novoProfessor();
      const outroProfessor = await novoProfessor();
      const turmaA = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(7 * 60, 8 * 60),
      });
      const turmaB = await criarTurma(api, token, {
        localId,
        professorId,
        horarios: todosOsDias(9 * 60, 10 * 60),
      });
      const turmaC = await criarTurma(api, token, {
        localId,
        professorId: outroProfessor,
        horarios: todosOsDias(7 * 60, 8 * 60),
      });
      await alunoPagante(20000, [turmaA]);
      await alunoPagante(15000, [turmaB]);
      await alunoPagante(11000, [turmaC]);
      await pagarQuadra(localId, 9000);

      const r = await resultado();
      const professor = r.professores.find((p) => p.id === professorId);
      expect(professor).toEqual({
        id: professorId,
        nome: expect.any(String),
        turmas: 2,
        receitaCentavos: 35000,
        custoCentavos: 6000,
        resultadoCentavos: 29000,
      });
      expect(r.professores.find((p) => p.id === outroProfessor)).toMatchObject({
        turmas: 1,
        receitaCentavos: 11000,
        custoCentavos: 3000,
        resultadoCentavos: 8000,
      });
    });
  });

  describe("permissões e auditoria", () => {
    it("CUSTO-CA-08: atendente e professor não acessam valor da hora, custos, pagamentos à quadra nem o resultado", async () => {
      const localId = await localComValor();
      const pago = await pagarQuadra(localId, 5000);
      for (const perfil of ["ATENDENTE", "PROFESSOR"] as const) {
        const { api, token, usuario } = await logado(app, perfil);
        await api
          .put(`/locais/${localId}/valor-hora`, { valorHoraCentavos: 100 }, token)
          .expect(403);
        await api.get(`/custos?competencia=${mesAtual()}`, token).expect(403);
        await api.get(`/custos/resultado?competencia=${mesAtual()}`, token).expect(403);
        await api
          .post(
            "/custos/pagamentos",
            { localId, competencia: mesAtual(), valorCentavos: 100, forma: "PIX", data: hoje() },
            token,
          )
          .expect(403);
        await api
          .post(`/custos/pagamentos/${pago.id}/estornar`, { motivo: "Teste" }, token)
          .expect(403);
        const negado = await prisma.auditoria.findFirst({
          where: { acao: "ACESSO_NEGADO", atorId: usuario.id },
        });
        expect(negado).not.toBeNull();
      }
      expect(
        (await prisma.pagamentoQuadra.findUniqueOrThrow({ where: { id: pago.id } })).estornadoEm,
      ).toBeNull();
      expect(
        (await prisma.local.findUniqueOrThrow({ where: { id: localId } })).valorHoraCentavos,
      ).toBe(6000);
    });

    it("CUSTO-CA-09: valor da hora, pagamento e estorno à quadra ficam na auditoria com autor, data e IP", async () => {
      const { api, token, usuario } = admin;
      const localId = await localComValor(6000);
      await api
        .put(`/locais/${localId}/valor-hora`, { valorHoraCentavos: 7000 }, token)
        .expect(200);
      const pago = await pagarQuadra(localId, 5000);
      await api
        .post(`/custos/pagamentos/${pago.id}/estornar`, { motivo: "Engano" }, token)
        .expect(200);

      const registros = await prisma.auditoria.findMany({
        where: { alvoId: localId },
        orderBy: { criadaEm: "asc" },
      });
      const acoes = registros.map((r) => r.acao);
      expect(acoes).toEqual(
        expect.arrayContaining([
          "LOCAL_VALOR_HORA_ALTERADO",
          "PAGAMENTO_QUADRA_REGISTRADO",
          "PAGAMENTO_QUADRA_ESTORNADO",
        ]),
      );
      for (const registro of registros.filter((r) => r.acao !== "LOCAL_CRIADO")) {
        expect(registro.atorId).toBe(usuario.id);
        expect(registro.ip).toBeTruthy();
        expect(registro.criadaEm).toBeInstanceOf(Date);
      }
      expect(
        registros.find(
          (r) => r.detalhes && (r.detalhes as { valorNovo?: number }).valorNovo === 7000,
        )?.detalhes,
      ).toMatchObject({
        valorAnterior: 6000,
        valorNovo: 7000,
      });
      expect(
        registros.find((r) => r.acao === "PAGAMENTO_QUADRA_ESTORNADO")?.detalhes,
      ).toMatchObject({
        pagamentoId: pago.id,
        motivo: "Engano",
      });
    });
  });
});
