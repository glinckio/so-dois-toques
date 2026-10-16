import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo } from "../src/aulas/regras.js";
import { mesEmSaoPaulo } from "../src/feedback/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp } from "./apoio.js";
import { criarTurma, logado } from "./apoio-aulas.js";

type Painel = {
  periodo: { de: string; ate: string };
  pausado: boolean;
  naoLidas: number;
  resumo: { quantidade: number; media: number | null; distribuicao: number[] };
  mensal: { competencia: string; quantidade: number; media: number | null }[];
  turmas: { id: string; descricao: string; ativa: boolean }[];
  respostas: {
    id: string;
    nota: number;
    comentario: string | null;
    melhoria: string | null;
    turma: string | null;
    nome: string | null;
    lida: boolean;
    criadaEm: string;
  }[];
};

describe("Etapa 19: feedback dos alunos", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
  });

  afterAll(async () => {
    await prisma.formularioFeedback.update({ where: { id: 1 }, data: { pausado: false } });
    await app.close();
  });

  /** Cada envio sai de um IP novo, para o limite por hora não atrapalhar. */
  const responder = (corpo: Record<string, unknown>) =>
    cliente(app).post("/feedback/respostas", corpo);

  async function painelDaTurma(turmaId: string, extra = ""): Promise<Painel> {
    return (
      await admin.api.get(`/feedback/painel?turmaId=${turmaId}${extra}`, admin.token).expect(200)
    ).body;
  }

  it("FEED-CA-01: sem login, envia nota com textos, turma e nome opcionais; dados inválidos são recusados", async () => {
    const turmaId = await criarTurma(admin.api, admin.token);

    await responder({
      nota: 5,
      comentario: "  Aulas ótimas!  ",
      melhoria: "Mais horários à noite",
      turmaId,
      nome: "Ana",
    }).expect(201);
    await responder({ nota: 3, turmaId }).expect(201);

    const { respostas } = await painelDaTurma(turmaId);
    expect(respostas).toHaveLength(2);
    const [anonima, identificada] = respostas;
    expect(identificada).toMatchObject({
      nota: 5,
      comentario: "Aulas ótimas!",
      melhoria: "Mais horários à noite",
      nome: "Ana",
      lida: false,
    });
    expect(identificada!.turma).toContain("Iniciante");
    expect(anonima).toMatchObject({ nota: 3, comentario: null, melhoria: null, nome: null });

    for (const nota of [0, 6, 4.5, "5", null]) {
      await responder({ nota }).expect(400);
    }
    await responder({ nota: 4, comentario: "a".repeat(1001) }).expect(400);
    await responder({ nota: 4, melhoria: "a".repeat(1001) }).expect(400);
    await responder({ nota: 4, nome: "a".repeat(121) }).expect(400);
    await responder({ nota: 4, turmaId: "nao-e-uuid" }).expect(400);
    const inexistente = await responder({
      nota: 4,
      turmaId: "00000000-0000-4000-8000-000000000000",
    });
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.message).toBe("Escolha uma turma da lista.");
  });

  it("FEED-CA-02: a página pública lista só as turmas ativas e nada de respostas nem alunos", async () => {
    const ativa = await criarTurma(admin.api, admin.token);
    const encerrada = await criarTurma(admin.api, admin.token);
    await admin.api.post(`/turmas/${encerrada}/encerrar`, {}, admin.token).expect(200);
    await responder({ nota: 4, comentario: "Segredo", nome: "Beto" }).expect(201);

    const resposta = await cliente(app).get("/feedback/formulario").expect(200);
    expect(Object.keys(resposta.body).sort()).toEqual(["pausado", "turmas"]);
    const ids = (resposta.body.turmas as { id: string; descricao: string }[]).map((t) => t.id);
    expect(ids).toContain(ativa);
    expect(ids).not.toContain(encerrada);
    for (const turma of resposta.body.turmas) {
      expect(Object.keys(turma).sort()).toEqual(["descricao", "id"]);
    }
    expect(JSON.stringify(resposta.body)).not.toContain("Segredo");
    expect(JSON.stringify(resposta.body)).not.toContain("Beto");

    // Turma encerrada também é recusada no envio.
    await responder({ nota: 4, turmaId: encerrada }).expect(400);
  });

  it("FEED-CA-03: o sexto envio do mesmo IP numa hora é recusado; a armadilha descarta; o IP não fica na resposta", async () => {
    const turmaId = await criarTurma(admin.api, admin.token);
    const mesmoIp = cliente(app);
    for (let i = 0; i < 5; i++) {
      await mesmoIp.post("/feedback/respostas", { nota: 4, turmaId }).expect(201);
    }
    const sexto = await mesmoIp.post("/feedback/respostas", { nota: 4, turmaId });
    expect(sexto.status).toBe(429);
    expect(sexto.body.message).toBe("Muitas respostas em pouco tempo. Tente de novo mais tarde.");
    // Outro IP continua respondendo.
    await responder({ nota: 4, turmaId }).expect(201);

    // Robô: recebe "ok", mas nada é gravado.
    await responder({ nota: 1, turmaId, site: "https://spam.exemplo" }).expect(201);
    const { resumo } = await painelDaTurma(turmaId);
    expect(resumo.quantidade).toBe(6);
    expect(resumo.distribuicao[0]).toBe(0);

    // A resposta não tem coluna de IP, e o registro de envios guarda só um hash.
    const colunas = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'RespostaFeedback'`;
    expect(colunas.map((c) => c.column_name).some((c) => /ip/i.test(c))).toBe(false);
    const envios = await prisma.envioFeedback.findMany({ take: 50, orderBy: { id: "desc" } });
    for (const envio of envios) {
      expect(envio.ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect(envio.ipHash).not.toContain(mesmoIp.ip);
    }
  });

  it("FEED-CA-04: com o formulário pausado, a página avisa e a API recusa; ao retomar, volta a aceitar", async () => {
    await admin.api.post("/feedback/formulario", { pausado: true }, admin.token).expect(200);
    expect((await cliente(app).get("/feedback/formulario").expect(200)).body.pausado).toBe(true);
    const recusada = await responder({ nota: 5 });
    expect(recusada.status).toBe(409);
    expect(recusada.body.message).toBe("No momento não estamos recebendo respostas.");

    await admin.api.post("/feedback/formulario", { pausado: false }, admin.token).expect(200);
    expect((await cliente(app).get("/feedback/formulario").expect(200)).body.pausado).toBe(false);
    await responder({ nota: 5 }).expect(201);
  });

  it("FEED-CA-05: o painel mostra média, quantidade, distribuição e a média mensal, com filtros", async () => {
    const turmaId = await criarTurma(admin.api, admin.token);
    for (const nota of [5, 5, 4, 2]) await responder({ nota, turmaId }).expect(201);

    // Uma resposta antiga (dois meses atrás) entra na média mensal, fora do período padrão.
    const antiga = new Date();
    antiga.setUTCDate(antiga.getUTCDate() - 62);
    await prisma.respostaFeedback.create({ data: { nota: 1, turmaId, criadaEm: antiga } });

    const painel = await painelDaTurma(turmaId);
    const hoje = hojeEmSaoPaulo(new Date());
    expect(painel.periodo.ate).toBe(hoje);
    expect(painel.resumo).toEqual({ quantidade: 4, media: 4, distribuicao: [0, 1, 0, 1, 2] });
    expect(painel.mensal).toHaveLength(12);
    expect(painel.mensal.at(-1)!.competencia).toBe(mesEmSaoPaulo(new Date()));
    const mesAntigo = painel.mensal.find((m) => m.competencia === mesEmSaoPaulo(antiga));
    expect(mesAntigo).toEqual({ competencia: mesEmSaoPaulo(antiga), quantidade: 1, media: 1 });
    expect(painel.turmas.some((t) => t.id === turmaId)).toBe(true);

    // Filtro por nota.
    const cinco = await painelDaTurma(turmaId, "&nota=5");
    expect(cinco.resumo.quantidade).toBe(2);
    expect(cinco.respostas.every((r) => r.nota === 5)).toBe(true);

    // Período que pega só a antiga.
    const diaAntigo = hojeEmSaoPaulo(antiga);
    const periodo = await painelDaTurma(turmaId, `&de=${diaAntigo}&ate=${diaAntigo}`);
    expect(periodo.resumo).toMatchObject({ quantidade: 1, media: 1 });

    // Período inválido.
    await admin.api.get(`/feedback/painel?de=${hoje}`, admin.token).expect(400);
    await admin.api.get("/feedback/painel?de=2026-02-10&ate=2026-02-01", admin.token).expect(400);
    await admin.api.get("/feedback/painel?nota=9", admin.token).expect(400);
  });

  it("FEED-CA-06: resposta nova chega como não lida; marca uma ou todas; o Início mostra a quantidade", async () => {
    const turmaId = await criarTurma(admin.api, admin.token);
    await responder({ nota: 4, turmaId }).expect(201);
    await responder({ nota: 3, turmaId }).expect(201);

    const antes = (await admin.api.get("/feedback/nao-lidas", admin.token).expect(200)).body;
    expect(antes.quantidade).toBeGreaterThanOrEqual(2);

    const { respostas } = await painelDaTurma(turmaId);
    expect(respostas.every((r) => !r.lida)).toBe(true);
    await admin.api
      .post(`/feedback/respostas/${respostas[0]!.id}/lida`, {}, admin.token)
      .expect(200);
    const depoisDeUma = (await admin.api.get("/feedback/nao-lidas", admin.token).expect(200)).body;
    expect(depoisDeUma.quantidade).toBe(antes.quantidade - 1);
    expect((await painelDaTurma(turmaId)).respostas.filter((r) => r.lida)).toHaveLength(1);

    await admin.api.post("/feedback/respostas/lidas", {}, admin.token).expect(200);
    expect(
      (await admin.api.get("/feedback/nao-lidas", admin.token).expect(200)).body.quantidade,
    ).toBe(0);
    expect((await painelDaTurma(turmaId)).respostas.every((r) => r.lida)).toBe(true);

    await admin.api
      .post("/feedback/respostas/00000000-0000-4000-8000-000000000000/lida", {}, admin.token)
      .expect(404);
  });

  it("FEED-CA-07: remover tira a resposta do painel e das médias, com auditoria; pausar e retomar também", async () => {
    const turmaId = await criarTurma(admin.api, admin.token);
    await responder({ nota: 5, turmaId }).expect(201);
    await responder({ nota: 1, turmaId, comentario: "spam ofensivo" }).expect(201);
    const { respostas } = await painelDaTurma(turmaId);
    const spam = respostas.find((r) => r.nota === 1)!;

    await admin.api.delete(`/feedback/respostas/${spam.id}`, admin.token).expect(200);
    const depois = await painelDaTurma(turmaId);
    expect(depois.respostas.map((r) => r.id)).not.toContain(spam.id);
    expect(depois.resumo).toMatchObject({ quantidade: 1, media: 5 });
    await admin.api.delete(`/feedback/respostas/${spam.id}`, admin.token).expect(404);

    await admin.api.post("/feedback/formulario", { pausado: true }, admin.token).expect(200);
    await admin.api.post("/feedback/formulario", { pausado: false }, admin.token).expect(200);

    const registros = await prisma.auditoria.findMany({
      where: {
        atorId: admin.usuario.id,
        acao: { in: ["FEEDBACK_REMOVIDO", "FEEDBACK_PAUSADO", "FEEDBACK_RETOMADO"] },
      },
      orderBy: { id: "asc" },
    });
    const remocao = registros.find((r) => r.alvoId === spam.id)!;
    expect(remocao).toMatchObject({ acao: "FEEDBACK_REMOVIDO", ip: admin.api.ip });
    expect(remocao.criadaEm).toBeInstanceOf(Date);
    expect(JSON.stringify(remocao.detalhes)).not.toContain("spam");
    const acoes = registros.map((r) => r.acao);
    expect(acoes).toContain("FEEDBACK_PAUSADO");
    expect(acoes).toContain("FEEDBACK_RETOMADO");
  });

  it("FEED-CA-08: o atendente não lê, não marca, não remove e não pausa", async () => {
    const atendente = await logado(app, "ATENDENTE");
    const id = "00000000-0000-4000-8000-000000000000";
    const { api, token } = atendente;
    await api.get("/acesso/feedback", token).expect(200, { area: "feedback", permitido: false });
    await api.get("/feedback/painel", token).expect(403);
    await api.get("/feedback/nao-lidas", token).expect(403);
    await api.post(`/feedback/respostas/${id}/lida`, {}, token).expect(403);
    await api.post("/feedback/respostas/lidas", {}, token).expect(403);
    await api.delete(`/feedback/respostas/${id}`, token).expect(403);
    await api.post("/feedback/formulario", { pausado: true }, token).expect(403);
    expect((await cliente(app).get("/feedback/formulario").expect(200)).body.pausado).toBe(false);
  });
});
