import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, criarLocal, criarTurma, logado, todosOsDias, unico } from "./apoio-aulas.js";

/** Data de N dias atrás no calendário de São Paulo. */
function diasAtras(n: number): string {
  return hojeEmSaoPaulo(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}

describe("Etapa 2: locais, turmas, matrículas e presença", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("AULAS-CA-09: locais com nome único; local inativo não recebe turma nova", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const nome = unico("Arena Copacabana");
    const local = await api
      .post("/locais", { nome, tipo: "PARCEIRA", endereco: "Av. Atlântica" }, token)
      .expect(201);
    expect(local.body).toMatchObject({ nome, tipo: "PARCEIRA", ativo: true });
    const repetido = await api.post("/locais", { nome, tipo: "PROPRIA" }, token).expect(409);
    expect(repetido.body.message).toBe("Já existe um local com esse nome.");

    await api
      .patch(`/locais/${local.body.id}`, { nome, tipo: "PARCEIRA", ativo: false }, token)
      .expect(200);
    const turma = await api.post(
      "/turmas",
      {
        nome: "Turma",
        nivel: "INICIANTE",
        localId: local.body.id,
        professorId: usuario.id,
        vagas: 8,
        horarios: todosOsDias(),
      },
      token,
    );
    expect(turma.status).toBe(400);
    expect(turma.body.message).toBe("Escolha um local ativo.");
    const lista = await api.get("/locais", token).expect(200);
    expect(lista.body.find((l: { id: string }) => l.id === local.body.id).ativo).toBe(false);
  });

  it("AULAS-CA-10: turma com nível, local, professor, vagas e horários; horários inválidos recusados", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const base = {
      nome: "Iniciantes manhã",
      nivel: "INICIANTE",
      localId,
      professorId: usuario.id,
      vagas: 12,
    };
    const horarios = [
      { diaSemana: 2, inicio: 7 * 60, fim: 8 * 60 },
      { diaSemana: 4, inicio: 7 * 60, fim: 8 * 60 },
    ];
    const criada = await api.post("/turmas", { ...base, horarios }, token).expect(201);
    const turma = await api.get(`/turmas/${criada.body.id}`, token).expect(200);
    expect(turma.body).toMatchObject({
      nome: "Iniciantes manhã",
      nivel: "INICIANTE",
      vagas: 12,
      ocupadas: 0,
      livres: 12,
      professor: { id: usuario.id },
      local: { id: localId },
      horarios,
    });

    const invalidos = [
      [],
      [{ diaSemana: 1, inicio: 9 * 60, fim: 8 * 60 }],
      [{ diaSemana: 1, inicio: 4 * 60, fim: 5 * 60 + 30 }],
      [{ diaSemana: 7, inicio: 9 * 60, fim: 10 * 60 }],
      [
        { diaSemana: 1, inicio: 9 * 60, fim: 10 * 60 },
        { diaSemana: 1, inicio: 9 * 60 + 30, fim: 11 * 60 },
      ],
    ];
    for (const h of invalidos) {
      const resposta = await api.post("/turmas", { ...base, horarios: h }, token);
      expect(resposta.status, JSON.stringify(h)).toBe(400);
    }
    await api.post("/turmas", { ...base, vagas: 0, horarios }, token).expect(400);
    await api.post("/turmas", { ...base, vagas: 41, horarios }, token).expect(400);
  });

  it("AULAS-CA-11: professor da turma não pode ser inativo nem atendente", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const { usuario: atendente } = await logado(app, "ATENDENTE");
    const { usuario: inativo } = await logado(app, "PROFESSOR");
    await prisma.usuario.update({ where: { id: inativo.id }, data: { ativo: false } });
    for (const professorId of [atendente.id, inativo.id]) {
      const resposta = await api.post(
        "/turmas",
        {
          nome: "Avançados",
          nivel: "AVANCADO",
          localId,
          professorId,
          vagas: 5,
          horarios: todosOsDias(),
        },
        token,
      );
      expect(resposta.status).toBe(400);
      expect(resposta.body.message).toBe(
        "O professor precisa ser um usuário ativo com perfil Professor ou Administrador.",
      );
    }
    const professores = await api.get("/professores", token).expect(200);
    const ids = professores.body.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(atendente.id);
    expect(ids).not.toContain(inativo.id);
  });

  it("AULAS-CA-12: o mesmo professor não tem duas turmas ativas no mesmo horário", async () => {
    const { api, token } = await logado(app, "ADMINISTRADOR");
    const { usuario: professor } = await logado(app, "PROFESSOR");
    const localId = await criarLocal(api, token);
    const primeira = await criarTurma(api, token, {
      localId,
      professorId: professor.id,
      horarios: [{ diaSemana: 1, inicio: 18 * 60, fim: 19 * 60 }],
    });
    const conflito = await api.post(
      "/turmas",
      {
        nome: "Conflitante",
        nivel: "INICIANTE",
        localId,
        professorId: professor.id,
        vagas: 5,
        horarios: [{ diaSemana: 1, inicio: 18 * 60 + 30, fim: 19 * 60 + 30 }],
      },
      token,
    );
    expect(conflito.status).toBe(409);
    expect(conflito.body.message).toMatch(
      /^O professor já tem a turma ".+" na segunda 18:00–19:00\.$/,
    );

    // Logo em seguida, no mesmo dia, pode.
    await criarTurma(api, token, {
      localId,
      professorId: professor.id,
      horarios: [{ diaSemana: 1, inicio: 19 * 60, fim: 20 * 60 }],
    });
    // Com a primeira encerrada, o horário fica livre.
    await api.post(`/turmas/${primeira}/encerrar`, {}, token).expect(200);
    await criarTurma(api, token, {
      localId,
      professorId: professor.id,
      horarios: [{ diaSemana: 1, inicio: 18 * 60 + 30, fim: 19 * 60 }],
    });
  });

  it("AULAS-CA-13: encerrar turma encerra matrículas e bloqueia matrícula e presença nova", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id });
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
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id, vagas: 2 });
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

  it("AULAS-CA-15: aluno em várias turmas, mas não duas vezes na mesma; vagas ocupadas e livres", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const t1 = await criarTurma(api, token, {
      localId,
      professorId: usuario.id,
      vagas: 5,
      horarios: todosOsDias(6 * 60, 7 * 60),
    });
    const t2 = await criarTurma(api, token, {
      localId,
      professorId: usuario.id,
      vagas: 5,
      horarios: todosOsDias(9 * 60, 10 * 60),
    });
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(201);
    await api.post(`/turmas/${t2}/matriculas`, { alunoId }, token).expect(201);
    const repetida = await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(409);
    expect(repetida.body.message).toBe("O aluno já está nessa turma.");

    const turma = await api.get(`/turmas/${t1}`, token).expect(200);
    expect(turma.body).toMatchObject({ vagas: 5, ocupadas: 1, livres: 4 });
    expect(turma.body.matriculas.map((m: { aluno: { id: string } }) => m.aluno.id)).toEqual([
      alunoId,
    ]);
    const aluno = await api.get(`/alunos/${alunoId}`, token).expect(200);
    expect(aluno.body.matriculas).toHaveLength(2);

    // Depois de encerrar a matrícula, pode voltar para a mesma turma.
    await api.post(`/matriculas/${turma.body.matriculas[0].id}/encerrar`, {}, token).expect(200);
    await api.post(`/turmas/${t1}/matriculas`, { alunoId }, token).expect(201);
  });

  it("AULAS-CA-16: vagas não podem ficar abaixo dos matriculados", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id, vagas: 3 });
    for (let i = 0; i < 2; i++) {
      await api
        .post(`/turmas/${turmaId}/matriculas`, { alunoId: await criarAluno(api, token) }, token)
        .expect(201);
    }
    const base = {
      nome: "Turma ajustada",
      nivel: "INTERMEDIARIO",
      localId,
      professorId: usuario.id,
      horarios: todosOsDias(),
    };
    const menos = await api.patch(`/turmas/${turmaId}`, { ...base, vagas: 1 }, token).expect(409);
    expect(menos.body.message).toBe(
      "A turma tem 2 alunos matriculados; as vagas não podem ficar abaixo disso.",
    );
    await api.patch(`/turmas/${turmaId}`, { ...base, vagas: 2 }, token).expect(200);
    expect((await api.get(`/turmas/${turmaId}`, token)).body).toMatchObject({
      nome: "Turma ajustada",
      nivel: "INTERMEDIARIO",
      vagas: 2,
    });
  });

  it("AULAS-CA-17: professor registra a presença com os alunos matriculados na data", async () => {
    const { api: adminApi, token: adminToken } = await logado(app, "ADMINISTRADOR");
    const { api, token, usuario: professor } = await logado(app, "PROFESSOR");
    const localId = await criarLocal(adminApi, adminToken);
    const turmaId = await criarTurma(adminApi, adminToken, { localId, professorId: professor.id });
    const [a, b, c] = [
      await criarAluno(adminApi, adminToken, { nome: "Ana Areia" }),
      await criarAluno(adminApi, adminToken, { nome: "Bruno Bola" }),
      await criarAluno(adminApi, adminToken, { nome: "Carla Cortada" }),
    ];
    for (const alunoId of [a, b, c]) {
      await adminApi.post(`/turmas/${turmaId}/matriculas`, { alunoId }, adminToken).expect(201);
    }
    // A turma e as matrículas de A e B começaram há uma semana; C entrou hoje.
    const semanaPassada = diasAtras(7);
    await prisma.turma.update({
      where: { id: turmaId },
      data: { inicio: paraDataDoBanco(semanaPassada) },
    });
    await prisma.matricula.updateMany({
      where: { turmaId, alunoId: { in: [a, b] } },
      data: { inicio: paraDataDoBanco(semanaPassada) },
    });

    const ontem = diasAtras(1);
    const lista = await api.get(`/turmas/${turmaId}/presencas/${ontem}`, token).expect(200);
    expect(
      lista.body.alunos.map((x: { nome: string; presente: null }) => [x.nome, x.presente]),
    ).toEqual([
      ["Ana Areia", null],
      ["Bruno Bola", null],
    ]);

    const salvo = await api
      .put(
        `/turmas/${turmaId}/presencas/${ontem}`,
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
    expect(salvo.body.alunos[0].registradaPor).toBe(professor.nome);

    // C não estava matriculado ontem.
    await api
      .put(
        `/turmas/${turmaId}/presencas/${ontem}`,
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
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const hoje = hojeEmSaoPaulo(new Date());
    const diaDeHoje = new Date(`${hoje}T12:00:00Z`).getUTCDay();
    const turmaId = await criarTurma(api, token, {
      localId,
      professorId: usuario.id,
      horarios: [{ diaSemana: diaDeHoje, inicio: 6 * 60, fim: 7 * 60 }],
    });
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
    const { api: profApi, token: profToken, usuario: professor } = await logado(app, "PROFESSOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: professor.id });
    const alunoId = await criarAluno(api, token);
    await api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token).expect(201);
    const hoje = hojeEmSaoPaulo(new Date());

    await profApi
      .put(
        `/turmas/${turmaId}/presencas/${hoje}`,
        { registros: [{ alunoId, presente: false }] },
        profToken,
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
      [professor.id, { data: hoje, registros: 1, correcoes: 0 }],
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

  it("AULAS-CA-20: professor só vê as turmas e os alunos dele; fora disso, não encontrado e auditado", async () => {
    const { api: adminApi, token: adminToken } = await logado(app, "ADMINISTRADOR");
    const { api, token, usuario: professor } = await logado(app, "PROFESSOR");
    const { usuario: outroProfessor } = await logado(app, "PROFESSOR");
    const localId = await criarLocal(adminApi, adminToken);
    const minha = await criarTurma(adminApi, adminToken, { localId, professorId: professor.id });
    const alheia = await criarTurma(adminApi, adminToken, {
      localId,
      professorId: outroProfessor.id,
    });
    const meuAluno = await criarAluno(adminApi, adminToken);
    const alunoAlheio = await criarAluno(adminApi, adminToken);
    await adminApi
      .post(`/turmas/${minha}/matriculas`, { alunoId: meuAluno }, adminToken)
      .expect(201);
    await adminApi
      .post(`/turmas/${alheia}/matriculas`, { alunoId: alunoAlheio }, adminToken)
      .expect(201);

    const turmas = await api.get("/turmas", token).expect(200);
    expect(turmas.body.map((t: { id: string }) => t.id)).toEqual([minha]);
    const alunos = await api.get("/alunos", token).expect(200);
    expect(alunos.body.itens.map((a: { id: string }) => a.id)).toEqual([meuAluno]);

    const aluno = await api.get(`/alunos/${meuAluno}`, token).expect(200);
    expect(aluno.body.email).toBeUndefined();
    expect(aluno.body.nascimento).toBeUndefined();
    expect(aluno.body.emergenciaTelefone).toBe("2134567890");

    const hoje = hojeEmSaoPaulo(new Date());
    await api.get(`/turmas/${alheia}`, token).expect(404);
    await api.get(`/alunos/${alunoAlheio}`, token).expect(404);
    await api.get(`/turmas/${alheia}/presencas/${hoje}`, token).expect(404);
    await api
      .put(
        `/turmas/${alheia}/presencas/${hoje}`,
        { registros: [{ alunoId: alunoAlheio, presente: true }] },
        token,
      )
      .expect(404);
    expect(
      await prisma.auditoria.count({ where: { acao: "ACESSO_NEGADO", atorId: professor.id } }),
    ).toBe(4);
    await api
      .put(
        `/turmas/${minha}/presencas/${hoje}`,
        { registros: [{ alunoId: meuAluno, presente: true }] },
        token,
      )
      .expect(200);
  });

  it("AULAS-CA-21: professor e atendente não fazem cadastros nem LGPD", async () => {
    const { api: adminApi, token: adminToken, usuario: admin } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(adminApi, adminToken);
    const turmaId = await criarTurma(adminApi, adminToken, { localId, professorId: admin.id });
    const alunoId = await criarAluno(adminApi, adminToken);

    for (const perfil of ["PROFESSOR", "ATENDENTE"] as const) {
      const { api, token, usuario } = await logado(app, perfil);
      const tentativas = [
        api.post("/alunos", { nome: "x" }, token),
        api.patch(`/alunos/${alunoId}`, { nome: "x" }, token),
        api.post(`/alunos/${alunoId}/inativar`, {}, token),
        api.get(`/alunos/${alunoId}/exportacao`, token),
        api.post(`/alunos/${alunoId}/anonimizar`, {}, token),
        api.get("/locais", token),
        api.post("/locais", { nome: "x", tipo: "PARCEIRA" }, token),
        api.post("/turmas", { nome: "x" }, token),
        api.patch(`/turmas/${turmaId}`, { nome: "x" }, token),
        api.post(`/turmas/${turmaId}/encerrar`, {}, token),
        api.post(`/turmas/${turmaId}/matriculas`, { alunoId }, token),
      ];
      for (const [i, resposta] of (await Promise.all(tentativas)).entries()) {
        expect(resposta.status, `${perfil}, tentativa ${i + 1}`).toBe(403);
        expect(resposta.body.message).toBe("Acesso negado");
      }
      expect(
        await prisma.auditoria.count({ where: { acao: "ACESSO_NEGADO", atorId: usuario.id } }),
      ).toBe(tentativas.length);
    }
    // O atendente nem chega à área de Aulas.
    const { api, token } = await logado(app, "ATENDENTE");
    await api.get("/turmas", token).expect(403);
    await api.get("/alunos", token).expect(403);
  });

  it("AULAS-CA-22: cadastros de local, turma e matrícula ficam na auditoria com autor e IP", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const localId = await criarLocal(api, token);
    const turmaId = await criarTurma(api, token, { localId, professorId: usuario.id });
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
      "LOCAL_CRIADO",
      "TURMA_CRIADA",
      "ALUNO_CRIADO",
      "MATRICULA_CRIADA",
      "MATRICULA_ENCERRADA",
      "ALUNO_INATIVADO",
      "TURMA_ENCERRADA",
    ]);
    for (const r of registros) expect(r.ip).toBe(api.ip);
  });
});
