import type { INestApplication } from "@nestjs/common";
import { executar } from "../src/cli/criar-admin.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp, novoEmail } from "./apoio.js";

describe("Etapa 1: primeiro administrador (pnpm admin:criar)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("ACESSO-CA-21: cria o primeiro administrador e recusa quando já existe um ativo", async () => {
    await prisma.usuario.updateMany({ where: { perfil: "ADMINISTRADOR" }, data: { ativo: false } });
    const email = novoEmail("dono");
    const ambiente = {
      ...process.env,
      ADMIN_NOME: "Dono da Arena",
      ADMIN_EMAIL: email,
      ADMIN_SENHA: "senha-do-dono-2026",
    };
    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    const saidas = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(await executar({ ...ambiente, ADMIN_SENHA: "123" })).toBe(1);
      expect(await executar(ambiente)).toBe(0);

      const admin = await prisma.usuario.findUniqueOrThrow({ where: { email } });
      expect(admin).toMatchObject({ perfil: "ADMINISTRADOR", ativo: true, trocarSenha: false });
      expect(admin.senhaHash).toMatch(/^\$argon2id\$/);
      expect(
        await prisma.auditoria.count({ where: { acao: "ADMIN_INICIAL_CRIADO", alvoId: admin.id } }),
      ).toBe(1);
      await cliente(app).entrar(email, "senha-do-dono-2026");

      expect(await executar({ ...ambiente, ADMIN_EMAIL: novoEmail("segundo") })).toBe(1);
      expect(erros).toHaveBeenLastCalledWith("Já existe um administrador ativo. Nada foi feito.");
      expect(await prisma.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } })).toBe(
        1,
      );
      expect(JSON.stringify([...erros.mock.calls, ...saidas.mock.calls])).not.toContain(
        "senha-do-dono-2026",
      );
    } finally {
      erros.mockRestore();
      saidas.mockRestore();
    }
  });
});
