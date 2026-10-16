import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import {
  criarAluno,
  criarTurma,
  diaDeHoje,
  horarioUnico,
  logado,
  quadraPadrao,
} from "./apoio-aulas.js";

/** Data de N dias atrás no calendário de São Paulo. */
function diasAtras(n: number): string {
  return hojeEmSaoPaulo(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

describe("Etapas 2 e 16: turmas (dia e horário), matrículas e presença", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("TURMA-CA-01 e TURMA-CA-08: turma só com dia, início, fim, nível, categoria e vagas; dados inválidos recusados", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const base = {
      quadraId: await quadraPadrao(),
      ...horarioUnico(2),
      nivel: "INICIANTE",
      categoria: "FEMININO",
      vagas: 12,
    };
    const criada = await api.post("/turmas", base, token).expect(201);
    const turma = await api.get(`/turmas/${criada.body.id}`, token).expect(200);
    expect(turma.body).toMatchObject({
      ...base,
      ocupadas: 0,
      livres: 12,
      ativa: true,
      descricao: expect.stringMatching(/^Terça, 21:\d\d às 21:\d\d · Iniciante · Feminino$/),
    });
    expect(turma.body).not.toHaveProperty("nome");
    expect(turma.body).not.toHaveProperty("professor");

    for (const errado of [
      { horaInicio: 4 * 60, horaFim: 5 * 60 + 30 },
      { horaInicio: 9 * 60, horaFim: 8 * 60 },
      { diaSemana: 7 },
      { vagas: 0 },
      { vagas: 41 },
      { categoria: "INFANTIL" },
      { categoria: undefined },
    ]) {
      const resposta = await api.post("/turmas", { ...base, ...errado }, token);
      expect(resposta.status, JSON.stringify(errado)).toBe(400);
    }
  });

  it("TURMA-CA-02 e FOCO-CA-04: duas turmas ativas não dividem o horário, ao criar e ao alterar", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const primeira = await criarTurma(api, token, {
      diaSemana: 3,
      horaInicio: 18 * 60,
      horaFim: 19 * 60,
    });
    const base = {
      quadraId: await quadraPadrao(),
      diaSemana: 3,
      nivel: "AVANCADO",
      categoria: "MASCULINO",
      vagas: 5,
    };
    const conflito = await api
      .post("/turmas", { ...base, horaInicio: 18 * 60 + 30, horaFim: 20 * 60 }, token)
      .expect(409);
    expect(conflito.body.message).toBe(
      "A quadra já tem a turma de Quarta, 18:00 às 19:00 · Iniciante · Misto.",
    );

    // Logo em seguida pode; mudar para cima da primeira, não.
    const segunda = await criarTurma(api, token, {
      diaSemana: 3,
      horaInicio: 19 * 60,
      horaFim: 20 * 60,
    });
    await api
      .patch(
        `/turmas/${segunda}`,
        { ...base, horaInicio: 17 * 60 + 30, horaFim: 18 * 60 + 30 },
        token,
      )
      .expect(409);
    // Mudar a própria turma sem sair do seu horário é aceito.
    await api
      .patch(`/turmas/${segunda}`, { ...base, horaInicio: 19 * 60, horaFim: 20 * 60 + 30 }, token)
      .expect(200);

    // Encerrada a primeira, o horário fica livre.
    await api.post(`/turmas/${primeira}/encerrar`, {}, token).expect(200);
    await criarTurma(api, token, { diaSemana: 3, horaInicio: 18 * 60, horaFim: 19 * 60 });
  });

  it("TURMA-CA-03: a lista mostra as turmas na ordem da semana e da hora, com vagas", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const sabado = await criarTurma(api, token, {
      diaSemana: 6,
      horaInicio: 8 * 60,
      horaFim: 9 * 60,
    });
    const segunda = await criarTurma(api, token, {
      diaSemana: 1,
      horaInicio: 8 * 60,
      horaFim: 9 * 60,
      nivel: "AVANCADO",
      vagas: 3,
    });
    await api
      .post(`/turmas/${segunda}/matriculas`, { alunoId: await criarAluno(api, token) }, token)
      .expect(201);
    const lista = (await api.get("/turmas", token).expect(200)).body as {
      id: string;
      descricao: string;
      ocupadas: number;
      livres: number;
    }[];
    const ids = lista.map((t) => t.id);
    expect(ids.indexOf(segunda)).toBeLessThan(ids.indexOf(sabado));
    expect(lista.find((t) => t.id === segunda)).toMatchObject({
      descricao: "Segunda, 08:00 às 09:00 · Avançado · Misto",
      ocupadas: 1,
      livres: 2,
    });
  });

  it("AULAS-CA-13: encerrar turma encerra matrículas e bloqueia matrícula e presença nova", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const turmaId = await criarTurma(api, token);
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);

    await api.post(`/turmas/${turmaId}/encerrar`, {}, token).expect(200);
    expect(await prisma.matricula.count({ where: { turmaId, fim: null } })).toBe(0);
    const outro = await criarAluno(api, token);
    const matricula = await api
      .post(`/turmas/${turmaId}/matriculas`, { alunoId: outro }, token)
      .expect(409);
    expect(matricula.body.message).toBe("Esta turma está encerrada.");
    await api
      .put(
        `/turmas/${turmaId}/presencas/${hojeEmSaoPaulo(new Date())}`,
        { registros: [{ alunoId, presente: true }] },
        token,
      )
      .expect(409);
    const encerradas = await api.get("/turmas?situacao=encerradas", token).expect(200);
    expect(encerradas.body.map((t: { id: string }) => t.id)).toContain(turmaId);
  });

  it("AULAS-CA-14: turma cheia recusa matrícula, inclusive com pedidos simultâneos para a última vaga", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const turmaId = await criarTurma(api, token, { vagas: 2 });
    const [a, b, c] = [
      await criarAluno(api, token),
      await criarAluno(api, token),
      await criarAluno(api, token),
    ];
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId: a }, token).expect(201);

    const respostas = await Promise.all([
      api.post(`/turmas/${turmaId}/matriculas`, { alunoId: b }, token),
      api.post(`/turmas/${turmaId}/matriculas`, { alunoId: c }, token),
    ]);
    expect(respostas.map((r) => r.status).sort((x, y) => x - y)).toEqual([201, 409]);
    expect(respostas.find((r) => r.status === 409)!.body.message).toBe("Turma sem vagas");
    expect(await prisma.matricula.count({ where: { turmaId, fim: null } })).toBe(2);
  });

  it("AULAS-CA-15: aluno em várias turmas (uma por dia), mas não duas vezes na mesma", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const t1 = await criarTurma(api, token, { vagas: 5, ...horarioUnico(1) });
    const t2 = await criarTurma(api, token, { vagas: 5, ...horarioUnico(4) });
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(201);
    await api.post(`/turmas/${t2}/matriculas`, { alunoId }, token).expect(201);
    const repetida = await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(409);
    expect(repetida.body.message).toBe("O aluno já está nessa turma.");

    const turma = await api.get(`/turmas/${t1}`, token).expect(200);
    expect(turma.body).toMatchObject({ vagas: 5, ocupadas: 1, livres: 4 });
    const aluno = await api.get(`/alunos/${alunoId}`, token).expect(200);
    expect(aluno.body.matriculas).toHaveLength(2);
    expect(aluno.body.matriculas[0].turma.descricao).toMatch(/ · Iniciante · Misto$/);

    // Depois de encerrar a matrícula, pode voltar para a mesma turma.
    await api.post(`/matriculas/${turma.body.matriculas[0].id}/encerrar`, {}, token).expect(200);
    await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(201);
  });

  it("AULAS-CA-16 e TURMA-CA-08: vagas não ficam abaixo dos matriculados; categoria muda ao alterar", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const horario = horarioUnico();
    const turmaId = await criarTurma(api, token, { ...horario, vagas: 3 });
    for (let i = 0; i < 2; i++) {
      await api
        .post(`/turmas/${turmaId}/matriculas`, { alunoId: await criarAluno(api, token) }, token)
        .expect(201);
    }
    const base = {
      quadraId: await quadraPadrao(),
      ...horario,
      nivel: "INTERMEDIARIO",
      categoria: "FEMININO",
    };
    const menos = await api.patch(`/turmas/${turmaId}`, { ...base, vagas: 1 }, token).expect(409);
    await api.patch(`/turmas/${turmaId}`, { ...horario, vagas: 3 }, token).expect(400);
    expect(menos.body.message).toBe(
      "A turma tem 2 alunos matriculados; as vagas não podem ficar abaixo disso.",
    );
    await api.patch(`/turmas/${turmaId}`, { ...base, vagas: 2 }, token).expect(200);
    // TURMA-CA-08: a categoria muda junto e aparece na descrição.
    expect((await api.get(`/turmas/${turmaId}`, token)).body).toMatchObject({
      nivel: "INTERMEDIARIO",
      categoria: "FEMININO",
      vagas: 2,
      descricao: expect.stringMatching(/ · Intermediário · Feminino$/),
    });
  });

  it("AULAS-CA-17 e TURMA-CA-05: o atendente marca a presença com os alunos matriculados na data", async () => {
    const { api: adminApi, token: adminToken } = await logado(app, "ADMINISTRADOR");
    const { api, token, usuario: atendente } = await logado(app, "ATENDENTE");
    const turmaId = await criarTurma(adminApi, adminToken);
    const [a, b, c] = [
      await criarAluno(adminApi, adminToken, { nome: "Ana Areia" }),
      await criarAluno(adminApi, adminToken, { nome: "Bruno Bola" }),
      await criarAluno(adminApi, adminToken, { nome: "Carla Cortada" }),
    ];
    for (const alunoId of [a, b, c]) {
      await adminApi.post(`/turmas/${turmaId}/matriculas`, { alunoId }, adminToken).expect(201);
    }
    // A turma e as matrículas de A e B começaram há duas semanas; C entrou hoje.
    const duasSemanas = diasAtras(14);
    await prisma.turma.update({
      where: { id: turmaId },
      data: { inicio: paraDataDoBanco(duasSemanas) },
    });
    await prisma.matricula.updateMany({
      where: { turmaId, alunoId: { in: [a, b] } },
      data: { inicio: paraDataDoBanco(duasSemanas) },
    });

    // A turma é no dia de hoje: a aula da semana passada foi há 7 dias.
    const semanaPassada = diasAtras(7);
    const lista = await api.get(`/turmas/${turmaId}/presencas/${semanaPassada}`, token).expect(200);
    expect(
      lista.body.alunos.map((x: { nome: string; presente: null }) => [x.nome, x.presente]),
    ).toEqual([
      ["Ana Areia", null],
      ["Bruno Bola", null],
    ]);

    const salvo = await api
      .put(
        `/turmas/${turmaId}/presencas/${semanaPassada}`,
        {
          registros: [
            { alunoId: a, presente: true },
            { alunoId: b, presente: false },
          ],
        },
        token,
      )
      .expect(200);
    expect(salvo.body.alunos.map((x: { presente: boolean }) => x.presente)).toEqual([true, false]);
    expect(salvo.body.alunos[0].registradaPor).toBe(atendente.nome);

    // C não estava matriculado na semana passada.
    await api
      .put(
        `/turmas/${turmaId}/presencas/${semanaPassada}`,
        { registros: [{ alunoId: c, presente: true }] },
        token,
      )
      .expect(400);
    const hoje = await api
      .get(`/turmas/${turmaId}/presencas/${hojeEmSaoPaulo(new Date())}`, token)
      .expect(200);
    expect(hoje.body.alunos).toHaveLength(3);
  });

  it("AULAS-CA-18: presença em data futura, sem aula ou antes da turma é recusada", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const turmaId = await criarTurma(api, token, horarioUnico(diaDeHoje()));
    const amanha = hojeEmSaoPaulo(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const futura = await api.get(`/turmas/${turmaId}/presencas/${amanha}`, token).expect(400);
    expect(futura.body.message).toBe("Não dá para registrar presença em data futura.");

    await prisma.turma.update({
      where: { id: turmaId },
      data: { inicio: paraDataDoBanco(diasAtras(20)) },
    });
    const semAula = await api
      .get(`/turmas/${turmaId}/presencas/${diasAtras(1)}`, token)
      .expect(400);
    expect(semAula.body.message).toBe("A turma não tem aula nesse dia da semana.");
    const antes = await api.get(`/turmas/${turmaId}/presencas/${diasAtras(28)}`, token).expect(400);
    expect(antes.body.message).toBe("A turma ainda não existia nessa data.");
    await api.get(`/turmas/${turmaId}/presencas/${diasAtras(7)}`, token).expect(200);
    await api.get(`/turmas/${turmaId}/presencas/2026-02-30`, token).expect(400);
  });

  it("AULAS-CA-19: presença corrigida guarda quem marcou e aparece na auditoria", async () => {
    const { api, token, usuario: admin } = await logado(app, "ADMINISTRADOR");
    const { api: atApi, token: atToken, usuario: atendente } = await logado(app, "ATENDENTE");
    const turmaId = await criarTurma(api, token);
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
    const hoje = hojeEmSaoPaulo(new Date());

    await atApi
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: false }] },
        atToken,
      )
      .expect(200);
    const corrigido = await api
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: true }] },
        token,
      )
      .expect(200);
    expect(corrigido.body.alunos[0]).toMatchObject({ presente: true, registradaPor: admin.nome });

    const registros = await prisma.auditoria.findMany({
      where: { acao: "PRESENCA_REGISTRADA", alvoId: turmaId },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => [r.atorId, r.detalhes])).toEqual([
      [atendente.id, { data: hoje, registros: 1, correcoes: 0 }],
      [admin.id, { data: hoje, registros: 1, correcoes: 1 }],
    ]);
    // Reenviar a mesma marcação não gera registro novo.
    await api
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: true }] },
        token,
      )
      .expect(200);
    expect(
      await prisma.auditoria.count({ where: { acao: "PRESENCA_REGISTRADA", alvoId: turmaId } }),
    ).toBe(2);
  });

  it("AULAS-CA-21 e TURMA-CA-05: o atendente vê turmas e alunos, mas não faz cadastros nem LGPD", async () => {
    const { api: adminApi, token: adminToken } = await logado(app, "ADMINISTRADOR");
    const turmaId = await criarTurma(adminApi, adminToken);
    const alunoId = await criarAluno(adminApi, adminToken);
    await adminApi.post(`/turmas/${turmaId}/matriculas`, { alunoId }, adminToken).expect(201);

    const { api, token, usuario } = await logado(app, "ATENDENTE");
    await api.get("/turmas", token).expect(200);
    const turma = await api.get(`/turmas/${turmaId}`, token).expect(200);
    expect(turma.body.matriculas.map((m: { aluno: { id: string } }) => m.aluno.id)).toEqual([
      alunoId,
    ]);
    await api.get("/alunos", token).expect(200);
    await api.get(`/alunos/${alunoId}`, token).expect(200);

    const tentativas = [
      api.post("/alunos", { nome: "x" }, token),
      api.patch(`/alunos/${alunoId}`, { nome: "x" }, token),
      api.post(`/alunos/${alunoId}/inativar`, {}, token),
      api.get(`/alunos/${alunoId}/exportacao`, token),
      api.post(`/alunos/${alunoId}/anonimizar`, {}, token),
      api.post("/turmas", { diaSemana: 1 }, token),
      api.patch(`/turmas/${turmaId}`, { diaSemana: 1 }, token),
      api.post(`/turmas/${turmaId}/encerrar`, {}, token),
      api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token),
    ];
    for (const [i, resposta] of (await Promise.all(tentativas)).entries()) {
      expect(resposta.status, `tentativa ${i + 1}`).toBe(403);
      expect(resposta.body.message).toBe("Acesso negado");
    }
    expect(
      await prisma.auditoria.count({ where: { acao: "ACESSO_NEGADO", atorId: usuario.id } }),
    ).toBe(tentativas.length);
  });

  it("AULAS-CA-22: cadastros de turma e matrícula ficam na auditoria com autor e IP", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const turmaId = await criarTurma(api, token);
    const alunoId = await criarAluno(api, token);
    const matricula = await api
      .post(`/turmas/${turmaId}/matriculas`, { alunoId }, token)
      .expect(201);
    await api.post(`/matriculas/${matricula.body.id}/encerrar`, {}, token).expect(200);
    await api.post(`/alunos/${alunoId}/inativar`, {}, token).expect(200);
    await api.post(`/turmas/${turmaId}/encerrar`, {}, token).expect(200);

    const registros = await prisma.auditoria.findMany({
      where: { atorId: usuario.id },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "LOGIN_SUCESSO",
      "TURMA_CRIADA",
      "ALUNO_CRIADO",
      "MATRICULA_CRIADA",
      "MATRICULA_ENCERRADA",
      "ALUNO_INATIVADO",
      "TURMA_ENCERRADA",
    ]);
    for (const r of registros) expect(r.ip).toBeTruthy();
  });
});
