import type { INestApplication } from "@nestjs/common";
import { diaDaSemana, hojeEmSaoPaulo } from "../src/aulas/regras.js";
import { somarDias } from "../src/horarios/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, criarTurma, logado } from "./apoio-aulas.js";

const hoje = () => hojeEmSaoPaulo(new Date());

describe("Etapa 14: agenda da quadra (aulas e bloqueios)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;
  // Cada teste usa uma semana só dele, para um não ocupar o horário do outro.
  let proximaSemana = 1;
  const semanaLivre = () => somarDias(hoje(), 7 * proximaSemana++);

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
  });

  afterAll(async () => {
    await app.close();
  });

  const bloquear = (dados: Record<string, unknown>) =>
    admin.api.post("/horarios/bloqueios", { motivo: "Manutenção", ...dados }, admin.token);

  it("FOCO-CA-05: a grade mostra as aulas das turmas no dia e os bloqueios valendo", async () => {
    const { api, token } = admin;
    const data = semanaLivre();
    const dia = diaDaSemana(data);
    const turmaId = await criarTurma(api, token, {
      diaSemana: dia,
      horaInicio: 7 * 60,
      horaFim: 8 * 60 + 30,
      vagas: 6,
    });
    await api
      .post(`/turmas/${turmaId}/matriculas`, { alunoId: await criarAluno(api, token) }, token)
      .expect(201);
    const outroDia = await criarTurma(api, token, {
      diaSemana: (dia + 1) % 7,
      horaInicio: 7 * 60,
      horaFim: 8 * 60,
    });
    const bloqueio = await bloquear({
      repeticao: "AVULSO",
      data,
      horaInicio: 10,
      horaFim: 12,
    }).expect(201);
    const cancelado = await bloquear({
      repeticao: "AVULSO",
      data,
      horaInicio: 14,
      horaFim: 15,
    }).expect(201);
    await api
      .post(`/horarios/bloqueios/${cancelado.body.id}/cancelar`, { motivo: "Desmarcado" }, token)
      .expect(200);

    const grade = (await api.get(`/horarios/grade?data=${data}`, token).expect(200)).body;
    expect(grade.data).toBe(data);
    expect(grade.quadra.nome).toBeTruthy();
    const aula = grade.aulas.find((a: { turmaId: string }) => a.turmaId === turmaId);
    expect(aula).toMatchObject({
      inicio: 420,
      fim: 510,
      vagas: 6,
      ocupadas: 1,
      nivel: "INICIANTE",
    });
    expect(grade.aulas.some((a: { turmaId: string }) => a.turmaId === outroDia)).toBe(false);
    expect(grade.bloqueios).toEqual([
      expect.objectContaining({ id: bloqueio.body.id, horaInicio: 10, horaFim: 12 }),
    ]);

    // Turma criada hoje não aparece antes do início; encerrada some a partir do encerramento.
    const ontemNaSemana = somarDias(hoje(), -((diaDaSemana(hoje()) - dia + 7) % 7 || 7));
    const antes = (await api.get(`/horarios/grade?data=${ontemNaSemana}`, token).expect(200)).body;
    expect(antes.aulas.some((a: { turmaId: string }) => a.turmaId === turmaId)).toBe(false);
    await api.post(`/turmas/${turmaId}/encerrar`, {}, token).expect(200);
    const depois = (await api.get(`/horarios/grade?data=${data}`, token).expect(200)).body;
    expect(depois.aulas.some((a: { turmaId: string }) => a.turmaId === turmaId)).toBe(false);
  });

  it("FOCO-CA-06: bloqueio avulso e semanal com motivo, sem cair sobre aula nem sobre outro bloqueio", async () => {
    const { api, token } = admin;
    const data = semanaLivre();
    const dia = diaDaSemana(data);
    await criarTurma(api, token, {
      diaSemana: dia,
      horaInicio: 18 * 60 + 30,
      horaFim: 19 * 60 + 30,
    });

    const sobreAula = await bloquear({
      repeticao: "AVULSO",
      data,
      horaInicio: 19,
      horaFim: 20,
    }).expect(409);
    const dataCurta = data.split("-").reverse().slice(0, 2).join("/");
    expect(sobreAula.body.message).toBe(`Tem aula nesse horário em ${dataCurta}.`);

    const semanal = await bloquear({
      repeticao: "SEMANAL",
      dataInicio: data,
      dataFim: somarDias(data, 14),
      horaInicio: 20,
      horaFim: 22,
      motivo: "Evento da liga",
    }).expect(201);
    expect(semanal.body.bloqueios).toBe(3);
    const serie = await prisma.serieBloqueio.findUniqueOrThrow({
      where: { id: semanal.body.serieId },
      include: { bloqueios: true },
    });
    expect(serie.motivo).toBe("Evento da liga");
    expect(serie.bloqueios).toHaveLength(3);

    const sobreBloqueio = await bloquear({
      repeticao: "AVULSO",
      data: somarDias(data, 7),
      horaInicio: 21,
      horaFim: 23,
    }).expect(409);
    expect(sobreBloqueio.body.message).toMatch(
      /^Esse horário já está bloqueado em \d{2}\/\d{2}\.$/,
    );

    // Dois pedidos ao mesmo tempo para o mesmo horário: só um passa.
    const livre = somarDias(data, 1);
    const respostas = await Promise.all([
      bloquear({ repeticao: "AVULSO", data: livre, horaInicio: 8, horaFim: 9 }),
      bloquear({ repeticao: "AVULSO", data: livre, horaInicio: 8, horaFim: 10 }),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);

    // Sem motivo, fora do horário da quadra, horas invertidas ou longe demais: recusado.
    for (const dados of [
      { repeticao: "AVULSO", data, horaInicio: 8, horaFim: 9, motivo: "" },
      { repeticao: "AVULSO", data, horaInicio: 4, horaFim: 6 },
      { repeticao: "AVULSO", data, horaInicio: 9, horaFim: 8 },
      { repeticao: "AVULSO", data: somarDias(hoje(), 200), horaInicio: 8, horaFim: 9 },
      { repeticao: "AVULSO", data: somarDias(hoje(), -1), horaInicio: 8, horaFim: 9 },
    ]) {
      const resposta = await bloquear(dados);
      expect(resposta.status, JSON.stringify(dados)).toBe(400);
    }
  });

  it("FOCO-CA-06: turma ou horário de turma sobre bloqueio futuro é recusado com as datas", async () => {
    const { api, token } = admin;
    const data = semanaLivre();
    const dia = diaDaSemana(data);
    await bloquear({ repeticao: "AVULSO", data, horaInicio: 6, horaFim: 7 }).expect(201);
    const base = { diaSemana: dia, nivel: "INICIANTE", categoria: "MISTO", vagas: 5 };
    const recusada = await api
      .post("/turmas", { ...base, horaInicio: 6 * 60 + 30, horaFim: 7 * 60 + 30 }, token)
      .expect(409);
    const dataCurta = data.split("-").reverse().slice(0, 2).join("/");
    expect(recusada.body.message).toBe(`A quadra está bloqueada nesse horário em ${dataCurta}.`);

    const turmaId = await criarTurma(api, token, {
      diaSemana: dia,
      horaInicio: 7 * 60,
      horaFim: 8 * 60,
    });
    await api
      .patch(`/turmas/${turmaId}`, { ...base, horaInicio: 6 * 60, horaFim: 7 * 60 }, token)
      .expect(409);
  });

  it("FOCO-CA-07: bloqueio cancela com motivo e libera o horário; começado não cancela", async () => {
    const { api, token } = admin;
    const data = semanaLivre();
    const bloqueio = await bloquear({
      repeticao: "AVULSO",
      data,
      horaInicio: 15,
      horaFim: 16,
    }).expect(201);
    await api.post(`/horarios/bloqueios/${bloqueio.body.id}/cancelar`, {}, token).expect(400);
    await api
      .post(`/horarios/bloqueios/${bloqueio.body.id}/cancelar`, { motivo: "Liberado" }, token)
      .expect(200);
    const detalhe = (await api.get(`/horarios/bloqueios/${bloqueio.body.id}`, token).expect(200))
      .body;
    expect(detalhe).toMatchObject({
      motivoCancelamento: "Liberado",
      canceladoPor: admin.usuario.nome,
    });
    await api
      .post(`/horarios/bloqueios/${bloqueio.body.id}/cancelar`, { motivo: "De novo" }, token)
      .expect(409);
    await bloquear({ repeticao: "AVULSO", data, horaInicio: 15, horaFim: 16 }).expect(201);

    const passado = await prisma.bloqueio.create({
      data: {
        data: new Date(`${somarDias(hoje(), -1)}T00:00:00.000Z`),
        horaInicio: 8,
        horaFim: 9,
        motivo: "Antigo",
        criadoPorId: admin.usuario.id,
      },
    });
    const comecou = await api
      .post(`/horarios/bloqueios/${passado.id}/cancelar`, { motivo: "Tarde" }, token)
      .expect(400);
    expect(comecou.body.message).toBe("Esse horário já começou e não pode ser cancelado.");

    // Encerrar o bloqueio semanal cancela os que ainda não começaram.
    const semanal = await bloquear({
      repeticao: "SEMANAL",
      dataInicio: somarDias(data, 1),
      dataFim: somarDias(data, 15),
      horaInicio: 12,
      horaFim: 13,
    }).expect(201);
    const series = (await api.get("/horarios/series", token).expect(200)).body;
    expect(series.find((s: { id: string }) => s.id === semanal.body.serieId)).toMatchObject({
      proximos: 3,
    });
    const encerrada = await api
      .post(`/horarios/series/${semanal.body.serieId}/encerrar`, {}, token)
      .expect(200);
    expect(encerrada.body.cancelados).toBe(3);
    await api.post(`/horarios/series/${semanal.body.serieId}/encerrar`, {}, token).expect(409);
  });

  it("FOCO-CA-08: todos veem a grade; só o administrador bloqueia, cancela e renomeia a quadra", async () => {
    const data = semanaLivre();
    const bloqueio = await bloquear({
      repeticao: "AVULSO",
      data,
      horaInicio: 9,
      horaFim: 10,
    }).expect(201);
    for (const perfil of ["ATENDENTE"] as const) {
      const { api, token } = await logado(app, perfil);
      await api.get(`/horarios/grade?data=${data}`, token).expect(200);
      await api.get("/horarios/quadra", token).expect(200);
      await api.get(`/horarios/bloqueios/${bloqueio.body.id}`, token).expect(200);
      await api.get("/horarios/series", token).expect(200);
      const tentativas = [
        api.post(
          "/horarios/bloqueios",
          { repeticao: "AVULSO", data, horaInicio: 11, horaFim: 12, motivo: "x" },
          token,
        ),
        api.post(`/horarios/bloqueios/${bloqueio.body.id}/cancelar`, { motivo: "x" }, token),
        api.patch("/horarios/quadra", { nome: "Minha" }, token),
      ];
      for (const resposta of await Promise.all(tentativas)) {
        expect(resposta.status, perfil).toBe(403);
      }
    }
  });

  it("FOCO-CA-13: renomear a quadra, bloquear e cancelar ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = await logado(app, "ADMINISTRADOR");
    const atual = (await api.get("/horarios/quadra", token).expect(200)).body;
    await api.patch("/horarios/quadra", { nome: "Quadra Central" }, token).expect(200);
    expect((await api.get("/horarios/quadra", token).expect(200)).body).toEqual({
      id: atual.id,
      nome: "Quadra Central",
    });
    await api.patch("/horarios/quadra", { nome: "x" }, token).expect(400);
    const data = semanaLivre();
    const bloqueio = await api
      .post(
        "/horarios/bloqueios",
        { repeticao: "AVULSO", data, horaInicio: 13, horaFim: 14, motivo: "Pintura" },
        token,
      )
      .expect(201);
    await api
      .post(`/horarios/bloqueios/${bloqueio.body.id}/cancelar`, { motivo: "Adiada" }, token)
      .expect(200);
    await api
      .post(
        "/horarios/bloqueios",
        {
          repeticao: "SEMANAL",
          dataInicio: data,
          dataFim: somarDias(data, 7),
          horaInicio: 16,
          horaFim: 17,
          motivo: "Torneio",
        },
        token,
      )
      .expect(201);

    const registros = await prisma.auditoria.findMany({
      where: { atorId: usuario.id, acao: { not: "LOGIN_SUCESSO" } },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "QUADRA_RENOMEADA",
      "BLOQUEIO_CRIADO",
      "BLOQUEIO_CANCELADO",
      "SERIE_CRIADA",
    ]);
    for (const r of registros) {
      expect(r.ip).toBeTruthy();
      expect(r.criadaEm).toBeInstanceOf(Date);
    }
  });
});
