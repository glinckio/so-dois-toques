import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp, criarUsuario, SENHA_BOA } from "./apoio.js";

describe("Etapa 1: auditoria", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("ACESSO-CA-18: as ações de acesso ficam registradas com autor, data, IP e detalhe", async () => {
    const admin = await criarUsuario(app, "ADMINISTRADOR");
    const api = cliente(app);
    await api.post("/auth/login", { email: admin.email, senha: "senha-errada-1" }).expect(401);
    const token = await api.entrar(admin.email, SENHA_BOA);
    const criado = await api.post(
      "/usuarios",
      { nome: "Ana", email: `ana-${admin.id}@exemplo.com`, perfil: "ATENDENTE" },
      token,
    );
    const alvoId: string = criado.body.usuario.id;
    await api.patch(`/usuarios/${alvoId}/perfil`, { perfil: "PROFESSOR" }, token).expect(200);
    await api.post(`/usuarios/${alvoId}/redefinir-senha`, {}, token).expect(200);
    await api.post(`/usuarios/${alvoId}/desativar`, {}, token).expect(200);
    await api
      .post("/auth/senha", { senhaAtual: SENHA_BOA, novaSenha: "outra-senha-boa-7" }, token)
      .expect(204);
    await api.post("/auth/logout", {}, token).expect(204);

    const registros = await prisma.auditoria.findMany({
      where: { atorId: admin.id },
      orderBy: { id: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "LOGIN_RECUSADO",
      "LOGIN_SUCESSO",
      "USUARIO_CRIADO",
      "USUARIO_PERFIL_ALTERADO",
      "SENHA_REDEFINIDA",
      "USUARIO_DESATIVADO",
      "SENHA_TROCADA",
      "LOGOUT",
    ]);
    for (const registro of registros) {
      expect(registro.ip).toBe(api.ip);
      expect(registro.criadaEm).toBeInstanceOf(Date);
    }
    expect(registros.find((r) => r.acao === "USUARIO_CRIADO")).toMatchObject({
      alvoTipo: "Usuario",
      alvoId,
      detalhes: { nome: "Ana", perfil: "ATENDENTE" },
    });
  });

  it("ACESSO-CA-19: registros de auditoria não podem ser alterados nem apagados", async () => {
    const admin = await criarUsuario(app, "ADMINISTRADOR");
    await cliente(app).entrar(admin.email, SENHA_BOA);
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { atorId: admin.id } });

    await expect(
      prisma.auditoria.update({ where: { id: registro.id }, data: { acao: "LOGOUT" } }),
    ).rejects.toThrow();
    await expect(prisma.auditoria.delete({ where: { id: registro.id } })).rejects.toThrow();
    await expect(prisma.auditoria.deleteMany({})).rejects.toThrow();
    await expect(prisma.$executeRawUnsafe('TRUNCATE "Auditoria"')).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "Auditoria" SET "ip" = NULL WHERE id = ${registro.id}`),
    ).rejects.toThrow(/não podem ser alterados/);

    const depois = await prisma.auditoria.findUniqueOrThrow({ where: { id: registro.id } });
    expect(depois).toEqual(registro);
  });

  it("ACESSO-CA-20: consulta por período, usuário e ação, com paginação", async () => {
    const admin = await criarUsuario(app, "ADMINISTRADOR");
    const professor = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(admin.email, SENHA_BOA);
    const apiProfessor = cliente(app);
    for (let i = 0; i < 3; i++) await apiProfessor.entrar(professor.email, SENHA_BOA);

    const pagina1 = await api
      .get(`/auditoria?usuarioId=${professor.id}&acao=LOGIN_SUCESSO&tamanho=2&pagina=1`, token)
      .expect(200);
    expect(pagina1.body).toMatchObject({ total: 3, pagina: 1, tamanho: 2 });
    expect(pagina1.body.itens).toHaveLength(2);
    expect(pagina1.body.itens[0]).toMatchObject({
      acao: "LOGIN_SUCESSO",
      atorId: professor.id,
      atorNome: professor.nome,
    });
    expect(typeof pagina1.body.itens[0].id).toBe("string");

    const pagina2 = await api
      .get(`/auditoria?usuarioId=${professor.id}&acao=LOGIN_SUCESSO&tamanho=2&pagina=2`, token)
      .expect(200);
    expect(pagina2.body.itens).toHaveLength(1);

    const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const vazio = await api
      .get(`/auditoria?usuarioId=${professor.id}&inicio=${futuro}`, token)
      .expect(200);
    expect(vazio.body.total).toBe(0);

    const passado = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const noPeriodo = await api
      .get(`/auditoria?usuarioId=${professor.id}&inicio=${passado}&fim=${futuro}`, token)
      .expect(200);
    expect(noPeriodo.body.total).toBe(3);

    await api.get(`/auditoria?inicio=${futuro}&fim=${passado}`, token).expect(400);
    await api.get("/auditoria?tamanho=1000", token).expect(400);
    await api.get("/auditoria?acao=APAGAR_TUDO", token).expect(400);
  });
});
