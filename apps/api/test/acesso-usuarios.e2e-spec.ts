import type { INestApplication } from "@nestjs/common";
import { hashToken } from "../src/acesso/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp, criarUsuario, novoEmail, SENHA_BOA } from "./apoio.js";

describe("Etapa 1: perfis e gestão de usuários", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function adminLogado() {
    const admin = await criarUsuario(app, "ADMINISTRADOR");
    const api = cliente(app);
    return { admin, api, token: await api.entrar(admin.email, SENHA_BOA) };
  }

  it("ACESSO-CA-10: Professor chamando a API de usuários recebe Acesso negado, com auditoria", async () => {
    const professor = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(professor.email, SENHA_BOA);
    const resposta = await api.get("/usuarios", token).expect(403);
    expect(resposta.body.message).toBe("Acesso negado");
    await api.get("/auditoria", token).expect(403);

    const negados = await prisma.auditoria.findMany({
      where: { acao: "ACESSO_NEGADO", atorId: professor.id },
    });
    expect(negados).toHaveLength(2);
    expect(negados[0]).toMatchObject({ ip: api.ip, detalhes: { area: "usuarios", metodo: "GET" } });
  });

  it("ACESSO-CA-10: Atendente abrindo pela tela uma área fora do perfil é negado e auditado", async () => {
    const atendente = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const token = await api.entrar(atendente.email, SENHA_BOA);
    expect((await api.get("/acesso/contabil", token).expect(200)).body).toEqual({
      area: "contabil",
      permitido: false,
    });
    expect((await api.get("/acesso/estoque", token).expect(200)).body.permitido).toBe(true);
    await api.get("/acesso/inexistente", token).expect(400);
    const negados = await prisma.auditoria.count({
      where: {
        acao: "ACESSO_NEGADO",
        atorId: atendente.id,
        detalhes: { path: ["origem"], equals: "tela" },
      },
    });
    expect(negados).toBe(1);
  });

  it("ACESSO-CA-11: cada perfil recebe só as áreas que pode acessar (base do menu)", async () => {
    const esperado = {
      ADMINISTRADOR: [
        "inicio",
        "aulas",
        "horarios",
        "estoque",
        "caixa",
        "contabil",
        "usuarios",
        "auditoria",
      ],
      PROFESSOR: ["inicio", "aulas"],
      ATENDENTE: ["inicio", "horarios", "estoque", "caixa"],
    } as const;
    for (const [perfil, areas] of Object.entries(esperado)) {
      const usuario = await criarUsuario(app, perfil as keyof typeof esperado);
      const api = cliente(app);
      const eu = await api.get("/auth/eu", await api.entrar(usuario.email, SENHA_BOA)).expect(200);
      expect(eu.body.areas, perfil).toEqual(areas);
    }
  });

  it("ACESSO-CA-12: administrador cadastra usuário e a senha temporária aparece uma única vez", async () => {
    const { api, token } = await adminLogado();
    const email = novoEmail("nova");
    const criado = await api
      .post(
        "/usuarios",
        { nome: "Maria Areia", email: email.toUpperCase(), perfil: "PROFESSOR" },
        token,
      )
      .expect(201);
    expect(criado.body.usuario).toMatchObject({
      nome: "Maria Areia",
      email,
      perfil: "PROFESSOR",
      trocarSenha: true,
    });
    expect(criado.body.senhaTemporaria).toMatch(/^.{16}$/);

    const lista = await api.get("/usuarios", token).expect(200);
    expect(JSON.stringify(lista.body)).not.toContain(criado.body.senhaTemporaria);
    expect(lista.body.some((u: { email: string }) => u.email === email)).toBe(true);

    await api
      .post("/usuarios", { nome: "Repetida", email, perfil: "ATENDENTE" }, token)
      .expect(409);
    const invalido = await api.post(
      "/usuarios",
      { nome: "X", email: "não-é-email", perfil: "CHEFE" },
      token,
    );
    expect(invalido.status).toBe(400);
    expect(invalido.body.message).toBe("Dados inválidos");
  });

  it("ACESSO-CA-13: com senha temporária, só dá para usar o sistema depois de trocar a senha", async () => {
    const { api: adminApi, token: tokenAdmin } = await adminLogado();
    const email = novoEmail("primeiro");
    const criado = await adminApi.post(
      "/usuarios",
      { nome: "Novo", email, perfil: "ATENDENTE" },
      tokenAdmin,
    );
    const api = cliente(app);
    const token = await api.entrar(email, criado.body.senhaTemporaria);

    const bloqueado = await api.get("/acesso/inicio", token).expect(403);
    expect(bloqueado.body.codigo).toBe("TROCA_DE_SENHA_OBRIGATORIA");
    expect((await api.get("/auth/eu", token).expect(200)).body.trocarSenha).toBe(true);

    const fraca = await api.post(
      "/auth/senha",
      { senhaAtual: criado.body.senhaTemporaria, novaSenha: "123456789" },
      token,
    );
    expect(fraca.status).toBe(400);
    await api
      .post(
        "/auth/senha",
        { senhaAtual: criado.body.senhaTemporaria, novaSenha: criado.body.senhaTemporaria },
        token,
      )
      .expect(400);
    await api
      .post("/auth/senha", { senhaAtual: criado.body.senhaTemporaria, novaSenha: SENHA_BOA }, token)
      .expect(204);
    await api.get("/acesso/inicio", token).expect(200);
  });

  it("ACESSO-CA-14: desativar encerra as sessões, impede o login e mantém o histórico", async () => {
    const { api: adminApi, token: tokenAdmin } = await adminLogado();
    const alvo = await criarUsuario(app, "PROFESSOR");
    const api = cliente(app);
    const token = await api.entrar(alvo.email, SENHA_BOA);

    const resposta = await adminApi
      .post(`/usuarios/${alvo.id}/desativar`, {}, tokenAdmin)
      .expect(200);
    expect(resposta.body.ativo).toBe(false);
    await api.get("/auth/eu", token).expect(401);
    expect(await prisma.sessao.count({ where: { usuarioId: alvo.id } })).toBe(0);
    await api.post("/auth/login", { email: alvo.email, senha: SENHA_BOA }).expect(401);

    const historico = await adminApi.get(`/auditoria?usuarioId=${alvo.id}`, tokenAdmin).expect(200);
    const acoes = historico.body.itens.map((i: { acao: string }) => i.acao);
    expect(acoes).toEqual(
      expect.arrayContaining(["LOGIN_SUCESSO", "USUARIO_DESATIVADO", "LOGIN_RECUSADO"]),
    );
    // Desativar de novo não faz nada nem audita outra vez.
    await adminApi.post(`/usuarios/${alvo.id}/desativar`, {}, tokenAdmin).expect(200);
    expect(
      await prisma.auditoria.count({ where: { acao: "USUARIO_DESATIVADO", alvoId: alvo.id } }),
    ).toBe(1);
  });

  it("ACESSO-CA-15: alterar o perfil encerra as sessões do usuário", async () => {
    const { api: adminApi, token: tokenAdmin } = await adminLogado();
    const alvo = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const token = await api.entrar(alvo.email, SENHA_BOA);

    const resposta = await adminApi.patch(
      `/usuarios/${alvo.id}/perfil`,
      { perfil: "PROFESSOR" },
      tokenAdmin,
    );
    expect(resposta.status).toBe(200);
    expect(resposta.body.perfil).toBe("PROFESSOR");
    await api.get("/auth/eu", token).expect(401);
    const registro = await prisma.auditoria.findFirstOrThrow({
      where: { acao: "USUARIO_PERFIL_ALTERADO", alvoId: alvo.id },
    });
    expect(registro.detalhes).toEqual({ de: "ATENDENTE", para: "PROFESSOR" });
  });

  it("ACESSO-CA-15: nova senha temporária invalida a antiga e exige troca", async () => {
    const { api: adminApi, token: tokenAdmin } = await adminLogado();
    const alvo = await criarUsuario(app, "ATENDENTE");
    const api = cliente(app);
    const token = await api.entrar(alvo.email, SENHA_BOA);

    const resposta = await adminApi
      .post(`/usuarios/${alvo.id}/redefinir-senha`, {}, tokenAdmin)
      .expect(200);
    await api.get("/auth/eu", token).expect(401);
    await api.post("/auth/login", { email: alvo.email, senha: SENHA_BOA }).expect(401);
    const login = await api
      .post("/auth/login", { email: alvo.email, senha: resposta.body.senhaTemporaria })
      .expect(200);
    expect(login.body.usuario.trocarSenha).toBe(true);
    await adminApi
      .post("/usuarios/00000000-0000-4000-8000-000000000000/redefinir-senha", {}, tokenAdmin)
      .expect(404);
  });

  it("ACESSO-CA-16: o último administrador ativo não pode ser desativado nem rebaixado", async () => {
    const { admin, api, token } = await adminLogado();
    await prisma.usuario.updateMany({
      where: { perfil: "ADMINISTRADOR", id: { not: admin.id } },
      data: { ativo: false },
    });
    const desativar = await api.post(`/usuarios/${admin.id}/desativar`, {}, token).expect(409);
    expect(desativar.body.message).toBe("O sistema precisa ter pelo menos um administrador ativo.");
    await api.patch(`/usuarios/${admin.id}/perfil`, { perfil: "PROFESSOR" }, token).expect(409);

    // Com um segundo administrador, a mudança passa a ser permitida.
    const outro = await criarUsuario(app, "ADMINISTRADOR");
    await api.patch(`/usuarios/${outro.id}/perfil`, { perfil: "ATENDENTE" }, token).expect(200);
    await api.post(`/usuarios/${admin.id}/desativar`, {}, token).expect(409);
  });

  it("ACESSO-CA-16: duas desativações simultâneas não deixam o sistema sem administrador", async () => {
    const a = await criarUsuario(app, "ADMINISTRADOR");
    const b = await criarUsuario(app, "ADMINISTRADOR");
    await prisma.usuario.updateMany({
      where: { perfil: "ADMINISTRADOR", id: { notIn: [a.id, b.id] } },
      data: { ativo: false },
    });
    const apiA = cliente(app);
    const apiB = cliente(app);
    const [tokenA, tokenB] = [
      await apiA.entrar(a.email, SENHA_BOA),
      await apiB.entrar(b.email, SENHA_BOA),
    ];
    const respostas = await Promise.all([
      apiA.post(`/usuarios/${b.id}/desativar`, {}, tokenA),
      apiB.post(`/usuarios/${a.id}/desativar`, {}, tokenB),
    ]);
    expect(respostas.map((r) => r.status).sort((x, y) => x - y)).toEqual([200, 409]);
    expect(await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } })).toBe(1);
  });

  it("ACESSO-CA-17: trocar a própria senha exige a atual e encerra as outras sessões", async () => {
    const usuario = await criarUsuario(app, "PROFESSOR");
    const celular = cliente(app);
    const computador = cliente(app);
    const tokenCelular = await celular.entrar(usuario.email, SENHA_BOA);
    const tokenComputador = await computador.entrar(usuario.email, SENHA_BOA);

    const errada = await computador.post(
      "/auth/senha",
      { senhaAtual: "nao-e-essa-1", novaSenha: "nova-senha-praia-9" },
      tokenComputador,
    );
    expect(errada.status).toBe(400);
    expect(errada.body.message).toBe("A senha atual não confere.");

    await computador
      .post(
        "/auth/senha",
        { senhaAtual: SENHA_BOA, novaSenha: "nova-senha-praia-9" },
        tokenComputador,
      )
      .expect(204);
    await computador.get("/auth/eu", tokenComputador).expect(200);
    await celular.get("/auth/eu", tokenCelular).expect(401);
    expect(await prisma.sessao.count({ where: { usuarioId: usuario.id } })).toBe(1);
    expect(await prisma.sessao.count({ where: { tokenHash: hashToken(tokenComputador) } })).toBe(1);
  });
});
