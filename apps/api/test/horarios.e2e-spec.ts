import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { diaDaSemana } from "../src/aulas/regras.js";
import { somarDias } from "../src/horarios/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { type Api, logado } from "./apoio-aulas.js";

const hoje = () => hojeEmSaoPaulo(new Date());
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

describe("Etapa 7: horários das quadras", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;
  let atendente: Awaited<ReturnType<typeof logado>>;
  let quadra1: string;
  let quadra2: string;
  // Cada teste reserva num dia só dele, para um não ocupar o horário do outro.
  let proximoDia = 2;
  const diaLivre = () => somarDias(hoje(), proximoDia++);

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
    atendente = await logado(app, "ATENDENTE");
    await prisma.faixaPreco.deleteMany();
    const { api, token } = admin;
    for (const faixa of [
      { horaInicio: 6, horaFim: 17, valorHoraCentavos: 6000 },
      { horaInicio: 17, horaFim: 23, valorHoraCentavos: 9000 },
    ]) {
      await api.post("/horarios/faixas", { dias: TODOS_OS_DIAS, ...faixa }, token).expect(201);
    }
    const quadras = (await api.get("/horarios/quadras", token).expect(200)).body;
    quadra1 = quadras[0].id;
    quadra2 = quadras[1].id;
  });

  afterAll(async () => {
    await fecharCaixa();
    await app.close();
  });

  async function abrirCaixa() {
    const { api, token } = admin;
    const atual = await api.get("/caixa/sessao", token).expect(200);
    if (atual.body.turno) return atual.body.turno.id as string;
    return (await api.post("/caixa/sessoes", { trocoInicialCentavos: 0 }, token).expect(201)).body
      .id as string;
  }

  async function fecharCaixa() {
    const { api, token } = admin;
    const turno = (await api.get("/caixa/sessao", token).expect(200)).body.turno;
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

  function reservar(dados: Record<string, unknown>, quem: { api: Api; token: string } = atendente) {
    return quem.api.post(
      "/horarios/reservas",
      {
        tipo: "RESERVA",
        repeticao: "AVULSA",
        quadraId: quadra1,
        horaInicio: 18,
        duracao: 1,
        clienteNome: "Cliente Teste",
        clienteTelefone: "(21) 99876-5432",
        ...dados,
      },
      quem.token,
    );
  }

  async function reservaOk(dados: Record<string, unknown>, quem?: { api: Api; token: string }) {
    const resposta = await reservar(dados, quem);
    if (resposta.status !== 201) throw new Error(`reserva: ${resposta.status} ${resposta.text}`);
    return resposta.body as { id: string; serieId: string | null; reservas: number };
  }

  const grade = async (data: string) =>
    (await admin.api.get(`/horarios/grade?data=${data}`, admin.token).expect(200)).body;

  /** Reserva gravada direto no banco, para horários perto de agora. */
  async function reservaDireta(inicio: Date) {
    const data = hojeEmSaoPaulo(inicio);
    const hora = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(inicio),
    );
    const reserva = await prisma.reserva.create({
      data: {
        tipo: "RESERVA",
        quadraId: quadra2,
        data: paraDataDoBanco(data),
        horaInicio: hora,
        horaFim: hora + 1,
        clienteNome: "Cliente Perto",
        valorCentavos: 6000,
        criadaPorId: admin.usuario.id,
      },
    });
    return reserva.id;
  }

  it("HOR-CA-01: administrador cria faixas para vários dias e remove; sobreposição e valores inválidos são recusados", async () => {
    const { api, token } = admin;
    const criada = await api
      .post(
        "/horarios/faixas",
        { dias: [5, 6], horaInicio: 23, horaFim: 24, valorHoraCentavos: 7000 },
        token,
      )
      .expect(201);
    expect(criada.body.ids).toHaveLength(2);
    const faixas = (await api.get("/horarios/faixas", token).expect(200)).body;
    expect(faixas.filter((f: { diaSemana: number }) => f.diaSemana === 6)).toEqual([
      expect.objectContaining({ horaInicio: 6, horaFim: 17, valorHoraCentavos: 6000 }),
      expect.objectContaining({ horaInicio: 17, horaFim: 23, valorHoraCentavos: 9000 }),
      expect.objectContaining({ horaInicio: 23, horaFim: 24, valorHoraCentavos: 7000 }),
    ]);

    const sobreposta = await api
      .post(
        "/horarios/faixas",
        { dias: [4, 5], horaInicio: 22, horaFim: 24, valorHoraCentavos: 7000 },
        token,
      )
      .expect(409);
    expect(sobreposta.body.message).toMatch(/sobrepõe/);
    await api
      .post(
        "/horarios/faixas",
        { dias: [1], horaInicio: 10, horaFim: 9, valorHoraCentavos: 7000 },
        token,
      )
      .expect(400);
    await api
      .post(
        "/horarios/faixas",
        { dias: [1], horaInicio: 23, horaFim: 24, valorHoraCentavos: 99 },
        token,
      )
      .expect(400);
    await api
      .post(
        "/horarios/faixas",
        { dias: [], horaInicio: 1, horaFim: 2, valorHoraCentavos: 500 },
        token,
      )
      .expect(400);

    for (const id of criada.body.ids) await api.delete(`/horarios/faixas/${id}`, token).expect(200);
    await api.delete(`/horarios/faixas/${criada.body.ids[0]}`, token).expect(404);
    const depois = (await api.get("/horarios/faixas", token).expect(200)).body;
    expect(depois.some((f: { horaFim: number }) => f.horaFim === 24)).toBe(false);
  });

  it("HOR-CA-02: a grade do dia mostra funcionamento, reservas e bloqueios por quadra, sem as canceladas", async () => {
    const data = diaLivre();
    const paga = await reservaOk({ data, horaInicio: 8, duracao: 2 });
    await atendente.api
      .post(`/horarios/reservas/${paga.id}/pagar`, { forma: "PIX" }, atendente.token)
      .expect(200);
    await reservaOk({ data, quadraId: quadra2, horaInicio: 8, duracao: 1 });
    await reservaOk(
      { tipo: "BLOQUEIO", motivo: "Aula iniciante", data, horaInicio: 10, duracao: 1 },
      admin,
    );
    const cancelada = await reservaOk({ data, horaInicio: 20, duracao: 1 });
    await atendente.api
      .post(`/horarios/reservas/${cancelada.id}/cancelar`, { motivo: "Desistiu" }, atendente.token)
      .expect(200);

    const g = await grade(data);
    expect(g.diaSemana).toBe(diaDaSemana(data));
    expect(g.faixas).toEqual([
      { horaInicio: 6, horaFim: 17, valorHoraCentavos: 6000 },
      { horaInicio: 17, horaFim: 23, valorHoraCentavos: 9000 },
    ]);
    expect(g.quadras.map((q: { nome: string }) => q.nome)).toEqual(["Quadra 1", "Quadra 2"]);
    expect(g.quadras[0].reservas).toEqual([
      expect.objectContaining({
        id: paga.id,
        tipo: "RESERVA",
        horaInicio: 8,
        horaFim: 10,
        clienteNome: "Cliente Teste",
        clienteTelefone: "21998765432",
        valorCentavos: 12000,
        pago: true,
      }),
      expect.objectContaining({
        tipo: "BLOQUEIO",
        horaInicio: 10,
        horaFim: 11,
        motivo: "Aula iniciante",
        valorCentavos: 0,
        pago: false,
      }),
    ]);
    expect(g.quadras[1].reservas).toHaveLength(1);
    expect(g.quadras[1].reservas[0].pago).toBe(false);
    await admin.api.get("/horarios/grade?data=2026-02-30", admin.token).expect(400);
  });

  it("HOR-CA-03: reserva avulsa soma as faixas; data passada, horário começado, longe demais, fora do funcionamento, duração inválida ou ocupado são recusados", async () => {
    const data = diaLivre();
    const criada = await reservaOk({ data, horaInicio: 16, duracao: 2 });
    const detalhe = (
      await atendente.api.get(`/horarios/reservas/${criada.id}`, atendente.token).expect(200)
    ).body;
    expect(detalhe).toMatchObject({
      quadra: "Quadra 1",
      data,
      horaInicio: 16,
      horaFim: 18,
      valorCentavos: 6000 + 9000,
      pago: false,
      serie: null,
    });

    const ontem = somarDias(hoje(), -1);
    expect((await reservar({ data: ontem })).body.message).toMatch(/já começou/);
    const longe = somarDias(hoje(), 181);
    expect((await reservar({ data: longe })).body.message).toMatch(/180 dias/);
    expect((await reservar({ data, horaInicio: 22, duracao: 2 })).body.message).toMatch(
      /fora do funcionamento/,
    );
    expect((await reservar({ data, horaInicio: 4, duracao: 1 })).status).toBe(400);
    expect((await reservar({ data, horaInicio: 10, duracao: 5 })).status).toBe(400);
    expect((await reservar({ data, horaInicio: 10, duracao: 0 })).status).toBe(400);
    expect((await reservar({ data, horaInicio: 23, duracao: 2 })).status).toBe(400);
    expect((await reservar({ data, clienteNome: "" })).status).toBe(400);
    expect((await reservar({ data, clienteTelefone: "123" })).status).toBe(400);

    const ocupado = await reservar({ data, horaInicio: 17, duracao: 1 });
    expect(ocupado.status).toBe(409);
    expect(ocupado.body.message).toMatch(/Horário ocupado/);
    // Na outra quadra, o mesmo horário está livre.
    await reservaOk({ data, quadraId: quadra2, horaInicio: 17, duracao: 1 });
    // Encostado (termina quando a outra começa) pode.
    await reservaOk({ data, horaInicio: 15, duracao: 1, clienteTelefone: null });
  });

  it("HOR-CA-04: duas reservas ao mesmo tempo para a mesma quadra e horário: só uma passa", async () => {
    const data = diaLivre();
    const respostas = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        reservar({ data, horaInicio: 19 - (i % 2), duracao: 2, clienteNome: `Cliente ${i}` }),
      ),
    );
    expect(respostas.filter((r) => r.status === 201)).toHaveLength(1);
    expect(respostas.filter((r) => r.status === 409)).toHaveLength(4);
    const g = await grade(data);
    expect(g.quadras[0].reservas).toHaveLength(1);
  });

  it("HOR-CA-05: reserva fixa cria as ocorrências semanais; conflito não cria nada; encerrar cancela as futuras não pagas", async () => {
    const inicio = diaLivre();
    proximoDia += 7 * 5;
    const fim = somarDias(inicio, 7 * 3);
    const serie = await reservaOk({
      repeticao: "SEMANAL",
      dataInicio: inicio,
      dataFim: fim,
      horaInicio: 7,
      duracao: 1,
    });
    expect(serie.reservas).toBe(4);
    expect(serie.serieId).toEqual(expect.any(String));
    const datas = [0, 1, 2, 3].map((i) => somarDias(inicio, 7 * i));
    for (const data of datas) {
      expect((await grade(data)).quadras[0].reservas).toEqual([
        expect.objectContaining({ horaInicio: 7, serieId: serie.serieId }),
      ]);
    }

    // Uma semana ocupada no meio: nada é criado e a data é informada.
    const outroInicio = somarDias(inicio, 1);
    await reservaOk({ data: somarDias(outroInicio, 14), horaInicio: 9, duracao: 1 });
    const conflito = await reservar({
      repeticao: "SEMANAL",
      dataInicio: outroInicio,
      dataFim: somarDias(outroInicio, 21),
      horaInicio: 9,
      duracao: 1,
    });
    expect(conflito.status).toBe(409);
    const [, mes, dia] = somarDias(outroInicio, 14).split("-");
    expect(conflito.body.message).toBe(`Horário ocupado em ${dia}/${mes}.`);
    expect((await grade(outroInicio)).quadras[0].reservas).toEqual([]);

    expect(
      (
        await reservar({
          repeticao: "SEMANAL",
          dataInicio: inicio,
          dataFim: somarDias(inicio, 7 * 26),
          horaInicio: 12,
        })
      ).body.message,
    ).toMatch(/26 semanas/);
    expect(
      (await reservar({ repeticao: "SEMANAL", dataInicio: fim, dataFim: inicio, horaInicio: 12 }))
        .status,
    ).toBe(400);

    const series = (await atendente.api.get("/horarios/series", atendente.token).expect(200)).body;
    expect(series).toContainEqual(
      expect.objectContaining({ id: serie.serieId, proximas: 4, proximasPagas: 0 }),
    );

    // Paga a segunda; encerrar cancela as outras três e mantém a paga.
    await atendente.api
      .post(
        `/horarios/reservas/${(await grade(datas[1] as string)).quadras[0].reservas[0].id}/pagar`,
        { forma: "DINHEIRO" },
        atendente.token,
      )
      .expect(200);
    const encerrada = await atendente.api
      .post(`/horarios/series/${serie.serieId}/encerrar`, {}, atendente.token)
      .expect(200);
    expect(encerrada.body).toEqual({ id: serie.serieId, canceladas: 3, mantidas: 1 });
    expect((await grade(datas[0] as string)).quadras[0].reservas).toEqual([]);
    expect((await grade(datas[1] as string)).quadras[0].reservas).toHaveLength(1);
    await atendente.api
      .post(`/horarios/series/${serie.serieId}/encerrar`, {}, atendente.token)
      .expect(409);
    const depois = (await atendente.api.get("/horarios/series", atendente.token).expect(200)).body;
    expect(depois.some((s: { id: string }) => s.id === serie.serieId)).toBe(false);
  });

  it("HOR-CA-06: administrador bloqueia avulso ou semanal com motivo; bloqueio ocupa a grade sem valor", async () => {
    const data = diaLivre();
    proximoDia += 14;
    const avulso = await reservaOk(
      { tipo: "BLOQUEIO", motivo: "Manutenção da areia", data, horaInicio: 6, duracao: 4 },
      admin,
    );
    const semanal = await reservaOk(
      {
        tipo: "BLOQUEIO",
        repeticao: "SEMANAL",
        motivo: "Aula avançado",
        dataInicio: data,
        dataFim: somarDias(data, 14),
        quadraId: quadra2,
        horaInicio: 19,
        duracao: 2,
      },
      admin,
    );
    expect(semanal.reservas).toBe(3);
    const detalhe = (await admin.api.get(`/horarios/reservas/${avulso.id}`, admin.token)).body;
    expect(detalhe).toMatchObject({
      tipo: "BLOQUEIO",
      motivo: "Manutenção da areia",
      valorCentavos: 0,
      clienteNome: null,
    });
    expect((await reservar({ data, horaInicio: 8 })).status).toBe(409);
    expect(
      (await reservar({ data: somarDias(data, 7), quadraId: quadra2, horaInicio: 20 })).status,
    ).toBe(409);
    expect(
      (await reservar({ tipo: "BLOQUEIO", motivo: "", data, horaInicio: 12 }, admin)).status,
    ).toBe(400);
    await admin.api
      .post(`/horarios/reservas/${avulso.id}/pagar`, { forma: "PIX" }, admin.token)
      .expect(400);
  });

  it('HOR-CA-07: pagar cria lançamento de entrada "Aluguel de quadra" ligado ao turno; pagar de novo é recusado; administrador estorna', async () => {
    const data = diaLivre();
    const turno = await abrirCaixa();
    const reserva = await reservaOk({ data, horaInicio: 19, duracao: 2 });
    const pago = await atendente.api
      .post(`/horarios/reservas/${reserva.id}/pagar`, { forma: "CARTAO_DEBITO" }, atendente.token)
      .expect(200);
    const lancamento = await prisma.lancamento.findUniqueOrThrow({
      where: { id: pago.body.lancamentoId },
    });
    expect(lancamento).toMatchObject({
      tipo: "ENTRADA",
      categoria: "ALUGUEL_QUADRA",
      valorCentavos: 18000,
      forma: "CARTAO_DEBITO",
      sessaoId: turno,
      origemTipo: "PagamentoReserva",
      origemId: pago.body.id,
    });
    expect(lancamento.descricao).not.toContain("Cliente");
    expect(lancamento.descricao).toContain("Quadra 1");

    const duplos = await Promise.all([
      atendente.api.post(
        `/horarios/reservas/${reserva.id}/pagar`,
        { forma: "PIX" },
        atendente.token,
      ),
      admin.api.post(`/horarios/reservas/${reserva.id}/pagar`, { forma: "PIX" }, admin.token),
    ]);
    expect(duplos.map((r) => r.status)).toEqual([409, 409]);

    await admin.api
      .post(
        `/horarios/reservas/${reserva.id}/estornar-pagamento`,
        { motivo: "Pagou errado" },
        admin.token,
      )
      .expect(200);
    const estorno = await prisma.lancamento.findUniqueOrThrow({
      where: { estornoDeId: lancamento.id },
    });
    expect(estorno).toMatchObject({ tipo: "SAIDA", categoria: "ESTORNO", valorCentavos: 18000 });
    await admin.api
      .post(
        `/horarios/reservas/${reserva.id}/estornar-pagamento`,
        { motivo: "De novo" },
        admin.token,
      )
      .expect(409);
    let detalhe = (await admin.api.get(`/horarios/reservas/${reserva.id}`, admin.token)).body;
    expect(detalhe.pago).toBe(false);
    expect(detalhe.pagamentos[0]).toMatchObject({ motivoEstorno: "Pagou errado" });

    // Volta a ficar a pagar; com o caixa fechado o pagamento fica fora de turno.
    await fecharCaixa();
    const semTurno = await atendente.api
      .post(`/horarios/reservas/${reserva.id}/pagar`, { forma: "PIX" }, atendente.token)
      .expect(200);
    expect(semTurno.body.semTurno).toBe(true);
    const outro = await prisma.lancamento.findUniqueOrThrow({
      where: { id: semTurno.body.lancamentoId },
    });
    expect(outro.sessaoId).toBeNull();
    detalhe = (await admin.api.get(`/horarios/reservas/${reserva.id}`, admin.token)).body;
    expect(detalhe.pago).toBe(true);
    expect(detalhe.pagamentos).toHaveLength(2);
  });

  it("HOR-CA-08: cancelar libera o horário; menos de 24 horas só o administrador; começado não cancela; paga é estornada junto", async () => {
    const data = diaLivre();
    const paga = await reservaOk({ data, horaInicio: 18, duracao: 1 });
    const pagamento = await atendente.api
      .post(`/horarios/reservas/${paga.id}/pagar`, { forma: "PIX" }, atendente.token)
      .expect(200);
    const cancelada = await atendente.api
      .post(`/horarios/reservas/${paga.id}/cancelar`, { motivo: "Chuva" }, atendente.token)
      .expect(200);
    expect(cancelada.body.estornoLancamentoId).toEqual(expect.any(String));
    const estorno = await prisma.lancamento.findUniqueOrThrow({
      where: { id: cancelada.body.estornoLancamentoId },
    });
    expect(estorno).toMatchObject({
      tipo: "SAIDA",
      categoria: "ESTORNO",
      valorCentavos: 9000,
      estornoDeId: pagamento.body.lancamentoId,
    });
    const detalhe = (await admin.api.get(`/horarios/reservas/${paga.id}`, admin.token)).body;
    expect(detalhe).toMatchObject({ motivoCancelamento: "Chuva", pago: false });
    expect(detalhe.canceladaEm).toEqual(expect.any(String));
    await atendente.api
      .post(`/horarios/reservas/${paga.id}/cancelar`, { motivo: "De novo" }, atendente.token)
      .expect(409);
    await atendente.api
      .post(`/horarios/reservas/${paga.id}/pagar`, { forma: "PIX" }, atendente.token)
      .expect(409);
    // O horário ficou livre.
    await reservaOk({ data, horaInicio: 18, duracao: 1 });

    const perto = await reservaDireta(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const negado = await atendente.api
      .post(`/horarios/reservas/${perto}/cancelar`, { motivo: "Desistiu" }, atendente.token)
      .expect(403);
    expect(negado.body.message).toMatch(/24 horas/);
    await admin.api
      .post(`/horarios/reservas/${perto}/cancelar`, { motivo: "Desistiu" }, admin.token)
      .expect(200);

    const passada = await reservaDireta(new Date(Date.now() - 26 * 60 * 60 * 1000));
    const comecou = await admin.api
      .post(`/horarios/reservas/${passada}/cancelar`, { motivo: "Tarde" }, admin.token)
      .expect(400);
    expect(comecou.body.message).toMatch(/já começou/);
    await admin.api
      .post(`/horarios/reservas/${paga.id}/cancelar`, { motivo: "" }, admin.token)
      .expect(400);
  });

  it("HOR-CA-09: atendente vê, reserva, recebe e cancela, mas não configura, não bloqueia e não estorna; professor não acessa", async () => {
    const data = diaLivre();
    const reserva = await reservaOk({ data, horaInicio: 9, duracao: 1 });
    const bloqueio = await reservaOk(
      { tipo: "BLOQUEIO", motivo: "Aula", data, horaInicio: 11, duracao: 1 },
      admin,
    );
    const { api, token } = atendente;
    await api.get("/horarios/grade", token).expect(200);
    await api.get("/horarios/faixas", token).expect(200);
    await api.get("/horarios/quadras", token).expect(200);
    await api
      .post(
        "/horarios/faixas",
        { dias: [1], horaInicio: 23, horaFim: 24, valorHoraCentavos: 500 },
        token,
      )
      .expect(403);
    const faixa = (await api.get("/horarios/faixas", token)).body[0].id;
    await api.delete(`/horarios/faixas/${faixa}`, token).expect(403);
    await api.patch(`/horarios/quadras/${quadra1}`, { nome: "Central" }, token).expect(403);
    expect(
      (await reservar({ tipo: "BLOQUEIO", motivo: "Aula", data, horaInicio: 13 })).status,
    ).toBe(403);
    await api
      .post(`/horarios/reservas/${bloqueio.id}/cancelar`, { motivo: "Teste" }, token)
      .expect(403);
    await api.post(`/horarios/reservas/${reserva.id}/pagar`, { forma: "PIX" }, token).expect(200);
    await api
      .post(`/horarios/reservas/${reserva.id}/estornar-pagamento`, { motivo: "Teste" }, token)
      .expect(403);
    await api
      .post(`/horarios/reservas/${reserva.id}/cancelar`, { motivo: "Teste" }, token)
      .expect(200);

    const professor = await logado(app, "PROFESSOR");
    await professor.api.get("/horarios/grade", professor.token).expect(403);
    await professor.api.get("/horarios/faixas", professor.token).expect(403);
    await professor.api.get(`/horarios/reservas/${reserva.id}`, professor.token).expect(403);
    expect((await reservar({ data, horaInicio: 14 }, professor)).status).toBe(403);
    await professor.api.get("/horarios/series", professor.token).expect(403);
  });

  it("HOR-CA-10: faixas, quadra, reservas, séries, bloqueios, pagamentos, estornos e cancelamentos ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = admin;
    const desde = new Date();
    const faixa = await api
      .post(
        "/horarios/faixas",
        { dias: [3], horaInicio: 23, horaFim: 24, valorHoraCentavos: 500 },
        token,
      )
      .expect(201);
    await api.delete(`/horarios/faixas/${faixa.body.ids[0]}`, token).expect(200);
    await api.patch(`/horarios/quadras/${quadra1}`, { nome: "Quadra Central" }, token).expect(200);
    expect(
      (await api.patch(`/horarios/quadras/${quadra2}`, { nome: "Quadra Central" }, token)).status,
    ).toBe(409);
    await api.patch(`/horarios/quadras/${quadra1}`, { nome: "Quadra 1" }, token).expect(200);
    const data = diaLivre();
    const reserva = await reservaOk({ data, horaInicio: 8 }, admin);
    await api.post(`/horarios/reservas/${reserva.id}/pagar`, { forma: "PIX" }, token).expect(200);
    await api
      .post(`/horarios/reservas/${reserva.id}/estornar-pagamento`, { motivo: "Engano" }, token)
      .expect(200);
    await api
      .post(`/horarios/reservas/${reserva.id}/cancelar`, { motivo: "Engano" }, token)
      .expect(200);
    const serie = await reservaOk(
      {
        tipo: "BLOQUEIO",
        repeticao: "SEMANAL",
        motivo: "Aula",
        dataInicio: data,
        dataFim: somarDias(data, 7),
        horaInicio: 12,
      },
      admin,
    );
    await api.post(`/horarios/series/${serie.serieId}/encerrar`, {}, token).expect(200);

    const registros = await prisma.auditoria.findMany({
      where: { atorId: usuario.id, criadaEm: { gte: desde } },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "FAIXAS_CRIADAS",
      "FAIXA_REMOVIDA",
      "QUADRA_RENOMEADA",
      "QUADRA_RENOMEADA",
      "RESERVA_CRIADA",
      "RESERVA_PAGA",
      "PAGAMENTO_RESERVA_ESTORNADO",
      "RESERVA_CANCELADA",
      "SERIE_CRIADA",
      "SERIE_ENCERRADA",
    ]);
    for (const r of registros) {
      expect(r.ip).toEqual(expect.any(String));
      expect(r.criadaEm).toBeInstanceOf(Date);
    }
    // Sem dado pessoal do cliente na auditoria.
    expect(JSON.stringify(registros.map((r) => r.detalhes))).not.toContain("Cliente Teste");
  });
});
