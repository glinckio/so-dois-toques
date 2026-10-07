import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { limiteDeRetencao, somarDias } from "../src/horarios/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { logado } from "./apoio-aulas.js";

describe("Etapa 9: prazo de guarda dos clientes das quadras", () => {
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

  async function reservaEm(data: string, horaInicio: number, nome: string | null) {
    const quadra = await prisma.quadra.findFirstOrThrow({ orderBy: { nome: "asc" } });
    return prisma.reserva.create({
      data: {
        tipo: nome ? "RESERVA" : "BLOQUEIO",
        quadraId: quadra.id,
        data: paraDataDoBanco(data),
        horaInicio,
        horaFim: horaInicio + 1,
        clienteNome: nome,
        clienteTelefone: nome ? "21998765432" : null,
        motivo: nome ? null : "Aula",
        valorCentavos: nome ? 8000 : 0,
        criadaPorId: admin.usuario.id,
      },
    });
  }

  it("LANC-CA-07: anonimiza só os clientes de reservas e séries além de 12 meses, sem mexer em valores", async () => {
    const { api, token } = admin;
    const limite = limiteDeRetencao(hojeEmSaoPaulo(new Date()));
    // Dias bem antigos, só deste teste, para não cruzar com reservas de outros testes.
    const antiga = await reservaEm(somarDias(limite, -400), 7, "Maria Antiga");
    const bloqueio = await reservaEm(somarDias(limite, -400), 8, null);
    const noLimite = await reservaEm(limite, 7, "João No Limite");
    const quadra = await prisma.quadra.findFirstOrThrow({ orderBy: { nome: "asc" } });
    const serie = await prisma.serieReserva.create({
      data: {
        tipo: "RESERVA",
        quadraId: quadra.id,
        diaSemana: 1,
        horaInicio: 9,
        horaFim: 10,
        clienteNome: "Time da Segunda",
        clienteTelefone: "21912345678",
        dataInicio: paraDataDoBanco(somarDias(limite, -500)),
        dataFim: paraDataDoBanco(somarDias(limite, -380)),
        criadaPorId: admin.usuario.id,
      },
    });
    const somaAntes = await prisma.lancamento.aggregate({ _sum: { valorCentavos: true } });

    const previa = await api.get("/horarios/clientes/anonimizaveis", token).expect(200);
    expect(previa.body).toMatchObject({ antesDe: limite, meses: 12 });
    expect(previa.body.reservas).toBeGreaterThanOrEqual(1);
    expect(previa.body.series).toBeGreaterThanOrEqual(1);

    await api.post("/horarios/clientes/anonimizar", {}, token).expect(400);
    const feito = await api
      .post("/horarios/clientes/anonimizar", { confirmar: true }, token)
      .expect(200);
    expect(feito.body).toEqual({
      antesDe: limite,
      reservas: previa.body.reservas,
      series: previa.body.series,
    });

    const depois = await prisma.reserva.findUniqueOrThrow({ where: { id: antiga.id } });
    expect(depois).toMatchObject({
      clienteNome: "Cliente anonimizado",
      clienteTelefone: null,
      valorCentavos: 8000,
      horaInicio: 7,
      quadraId: antiga.quadraId,
    });
    expect(await prisma.serieReserva.findUniqueOrThrow({ where: { id: serie.id } })).toMatchObject({
      clienteNome: "Cliente anonimizado",
      clienteTelefone: null,
    });
    expect(await prisma.reserva.findUniqueOrThrow({ where: { id: noLimite.id } })).toMatchObject({
      clienteNome: "João No Limite",
      clienteTelefone: "21998765432",
    });
    expect(await prisma.reserva.findUniqueOrThrow({ where: { id: bloqueio.id } })).toMatchObject({
      clienteNome: null,
      motivo: "Aula",
    });
    expect(await prisma.lancamento.aggregate({ _sum: { valorCentavos: true } })).toEqual(somaAntes);

    // Nada mais a anonimizar; a ação fica na auditoria com as quantidades.
    const vazia = await api.get("/horarios/clientes/anonimizaveis", token).expect(200);
    expect(vazia.body).toMatchObject({ reservas: 0, series: 0 });
    const registro = await prisma.auditoria.findFirstOrThrow({
      where: { acao: "CLIENTES_ANONIMIZADOS", atorId: admin.usuario.id },
      orderBy: { id: "desc" },
    });
    expect(registro.detalhes).toEqual(feito.body);
    expect(registro.ip).toBe(api.ip);
  });

  it("LANC-CA-08: atendente e professor não veem a prévia nem anonimizam", async () => {
    const antiga = await reservaEm(
      somarDias(limiteDeRetencao(hojeEmSaoPaulo(new Date())), -410),
      7,
      "Pedro",
    );
    for (const perfil of ["ATENDENTE", "PROFESSOR"] as const) {
      const { api, token } = await logado(app, perfil);
      await api.get("/horarios/clientes/anonimizaveis", token).expect(403);
      await api.post("/horarios/clientes/anonimizar", { confirmar: true }, token).expect(403);
    }
    expect(await prisma.reserva.findUniqueOrThrow({ where: { id: antiga.id } })).toMatchObject({
      clienteNome: "Pedro",
    });
  });
});
