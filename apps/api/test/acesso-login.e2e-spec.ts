import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { hashToken } from "../src/acesso/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp, criarUsuario, novoEmail, SENHA_BOA } from "./apoio.js";

describe("Etapa 1: login e sessões", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("ACESSO-CA-01: usuário ativo com e-mail e senha corretos entra no sistema", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const resposta = await api.post("/auth/login", {
      email: ` ${usuario.email.toUpperCase()} `,
      senha: SENHA_BOA,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.body.usuario).toMatchObject({
      id: usuario.id,
      perfil: "PROFESSOR",
      trocarSenha: false,
    });
    expect(resposta.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const eu = await api.get("/auth/eu", resposta.body.token).expect(200);
    expect(eu.body).toMatchObject({ id: usuario.id, areas: ["inicio", "aulas"] });
  });

  it("ACESSO-CA-02: e-mail inexistente e senha errada recebem a mesma mensagem", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const senhaErrada = await api.post("/auth/login", {
      email: usuario.email,
      senha: "senha-errada-123",
    });
    const inexistente = await api.post("/auth/login", {
      email: novoEmail(),
      senha: "senha-errada-123",
    });
    expect(senhaErrada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(senhaErrada.body).toEqual(inexistente.body);
    expect(senhaErrada.body.message).toBe("E-mail ou senha incorretos");
  });

  it("ACESSO-CA-02: usuário desativado recebe a mesma mensagem de senha errada", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    const resposta = await cliente(app).post("/auth/login", {
      email: usuario.email,
      senha: SENHA_BOA,
    });
    expect(resposta.status).toBe(401);
    expect(resposta.body.message).toBe("E-mail ou senha incorretos");
  });

  it("ACESSO-CA-03: 5 erros seguidos bloqueiam o e-mail mesmo com a senha certa, com auditoria", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    for (let i = 0; i < 5; i++) {
      await api.post("/auth/login", { email: usuario.email, senha: `errada-${i}-xyz` }).expect(401);
    }
    const bloqueado = await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.message).toBe("Muitas tentativas. Tente novamente em alguns minutos.");

    // Outro IP também não entra: o bloqueio é do e-mail.
    await cliente(app).post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(429);

    const registros = await prisma.auditoria.count({
      where: { acao: "LOGIN_BLOQUEADO", detalhes: { path: ["email"], equals: usuario.email } },
    });
    expect(registros).toBeGreaterThan(0);
  });

  it("ACESSO-CA-03: o bloqueio vale também para e-mail que não existe", async () => {
    const email = novoEmail("fantasma");
    const api = cliente(app);
    for (let i = 0; i < 5; i++)
      await api.post("/auth/login", { email, senha: "qualquer-coisa" }).expect(401);
    await api.post("/auth/login", { email, senha: "qualquer-coisa" }).expect(429);
  });

  it("ACESSO-CA-03: o bloqueio termina 15 minutos depois do último erro", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    for (let i = 0; i < 5; i++)
      await api.post("/auth/login", { email: usuario.email, senha: "errada-abc-1" });
    await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(429);

    await prisma.tentativaLogin.updateMany({
      where: { email: usuario.email },
      data: { criadaEm: new Date(Date.now() - 16 * 60 * 1000) },
    });
    await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(200);
  });

  it("ACESSO-CA-04: 20 erros do mesmo IP em 15 minutos bloqueiam esse IP", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    for (let i = 0; i < 20; i++) {
      await api
        .post("/auth/login", { email: novoEmail("ataque"), senha: "senha-errada-1" })
        .expect(401);
    }
    await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(429);
    // De outro IP, o mesmo usuário entra normalmente.
    await cliente(app).post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(200);
  });

  it("ACESSO-CA-05: sem sessão, a API responde 401 (exceto login e health)", async () => {
    const api = cliente(app);
    for (const rota of ["/auth/eu", "/usuarios", "/auditoria", "/acesso/inicio"]) {
      const resposta = await api.get(rota);
      expect(resposta.status, rota).toBe(401);
    }
    await api.get("/auth/eu", "token-inventado").expect(401);
    await api.post("/auth/login", { email: novoEmail(), senha: "x" }).expect(401);
    await request(app.getHttpServer()).get("/health").expect(200);
  });

  it("ACESSO-CA-05: sem a chave interna, nem o login responde", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: usuario.email, senha: SENHA_BOA })
      .expect(401);
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("X-Chave-Interna", "chave-errada")
      .send({ email: usuario.email, senha: SENHA_BOA })
      .expect(401);
  });

  it("ACESSO-CA-06: sessão sem uso por 12 horas deixa de valer", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(usuario.email, SENHA_BOA);
    await prisma.sessao.update({
      where: { tokenHash: hashToken(token) },
      data: { ultimoUsoEm: new Date(Date.now() - 12 * 60 * 60 * 1000 - 1000) },
    });
    const resposta = await api.get("/auth/eu", token).expect(401);
    expect(resposta.body.message).toBe("Sessão expirada. Entre novamente.");
    expect(await prisma.sessao.count({ where: { tokenHash: hashToken(token) } })).toBe(0);
  });

  it("ACESSO-CA-06: sessão com 7 dias desde o login deixa de valer, mesmo em uso", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(usuario.email, SENHA_BOA);
    await prisma.sessao.update({
      where: { tokenHash: hashToken(token) },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });
    await api.get("/auth/eu", token).expect(401);
  });

  it("ACESSO-CA-06: o uso da sessão renova o prazo de inatividade", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(usuario.email, SENHA_BOA);
    const antigo = new Date(Date.now() - 11 * 60 * 60 * 1000);
    await prisma.sessao.update({
      where: { tokenHash: hashToken(token) },
      data: { ultimoUsoEm: antigo },
    });
    await api.get("/auth/eu", token).expect(200);
    const sessao = await prisma.sessao.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
    });
    expect(sessao.ultimoUsoEm.getTime()).toBeGreaterThan(antigo.getTime());
  });

  it("ACESSO-CA-07: depois de sair, o token antigo não dá acesso", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const token = await api.entrar(usuario.email, SENHA_BOA);
    await api.post("/auth/logout", {}, token).expect(204);
    await api.get("/auth/eu", token).expect(401);
    const saida = await prisma.auditoria.count({ where: { acao: "LOGOUT", atorId: usuario.id } });
    expect(saida).toBe(1);
  });

  it("ACESSO-CA-08: o banco guarda só o hash do identificador da sessão", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const token = await cliente(app).entrar(usuario.email, SENHA_BOA);
    const sessoes = await prisma.sessao.findMany({ where: { usuarioId: usuario.id } });
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0]!.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(sessoes)).not.toContain(token);
  });

  it("ACESSO-CA-09: senha guardada só como Argon2id e nunca devolvida nem auditada", async () => {
    const usuario = await criarUsuario(app, "ADMINISTRADOR");
    const api = cliente(app);
    const login = await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA });
    await api.post("/auth/login", { email: usuario.email, senha: "senha-errada-secreta" });
    const salvo = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(salvo.senhaHash).toMatch(/^\$argon2id\$/);

    const lista = await api.get("/usuarios", login.body.token).expect(200);
    const respostas = JSON.stringify([login.body, lista.body]);
    expect(respostas).not.toMatch(/senhaHash|argon2/);
    expect(respostas).not.toContain(SENHA_BOA);

    const registros = await prisma.auditoria.findMany({
      where: { OR: [{ atorId: usuario.id }, { alvoId: usuario.id }] },
    });
    const auditoria = JSON.stringify(registros.map((r) => ({ ...r, id: String(r.id) })));
    expect(auditoria).not.toContain(SENHA_BOA);
    expect(auditoria).not.toContain("senha-errada-secreta");
  });

  it("ACESSO-CA-03: tentativas simultâneas não passam de 5 antes do bloqueio", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const respostas = await Promise.all(
      Array.from({ length: 12 }, () =>
        api.post("/auth/login", { email: usuario.email, senha: "senha-errada-em-rajada" }),
      ),
    );
    const status = respostas.map((r) => r.status);
    expect(status.filter((s) => s === 401)).toHaveLength(5);
    expect(status.filter((s) => s === 429)).toHaveLength(7);
    await api.post("/auth/login", { email: usuario.email, senha: SENHA_BOA }).expect(429);
  });

  it("ACESSO-CA-04: sem IP informado, as tentativas contam juntas e também bloqueiam", async () => {
    const usuario = await criarUsuario(app, "ATENDENTE");
    const chave = process.env["INTERNAL_API_KEY"]!;
    const semIp = (email: string, senha: string) =>
      request(app.getHttpServer())
        .post("/auth/login")
        .set("X-Chave-Interna", chave)
        .send({ email, senha });
    try {
      for (let i = 0; i < 20; i++) {
        await semIp(novoEmail("sem-ip"), "senha-errada-1").expect(401);
      }
      await semIp(usuario.email, SENHA_BOA).expect(429);
      await cliente(app)
        .post("/auth/login", { email: usuario.email, senha: SENHA_BOA })
        .expect(200);
    } finally {
      // Libera o balde sem IP para os outros testes.
      await prisma.tentativaLogin.updateMany({
        where: { ip: null },
        data: { criadaEm: new Date(Date.now() - 16 * 60 * 1000) },
      });
    }
  });
});
