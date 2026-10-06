import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { PerfilUsuario } from "../src/acesso/regras.js";
import { gerarHashSenha } from "../src/acesso/senhas.js";
import { AppModule } from "../src/app.module.js";
import { ENV } from "../src/config.module.js";
import { parseEnv, type Env } from "../src/env.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { configureApp } from "../src/setup.js";

export const SENHA_BOA = "areia-quadra-2026";

export async function criarApp(overrides: Partial<Env> = {}): Promise<INestApplication> {
  // A geração automática de mensalidades fica desligada: cada teste gera o mês que precisa.
  const env = { ...parseEnv(process.env), GERACAO_AUTOMATICA: false, ...overrides };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, env);
  await app.init();
  return app;
}

/** IP de documentação único por teste, para os bloqueios por IP não se misturarem. */
export function novoIp(): string {
  const n = Math.floor(Math.random() * 65000) + 1;
  return `2001:db8::${n.toString(16)}`;
}

export function novoEmail(prefixo = "pessoa"): string {
  return `${prefixo}-${randomUUID().slice(0, 8)}@exemplo.com`;
}

/** Cliente que fala com a API como o servidor do Next.js fala. */
export function cliente(app: INestApplication, ip = novoIp()) {
  const chave = parseEnv(process.env).INTERNAL_API_KEY;
  const servidor = app.getHttpServer();
  const montar = (req: request.Test, token?: string) => {
    req.set("X-Chave-Interna", chave).set("X-IP-Cliente", ip);
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  return {
    ip,
    get: (rota: string, token?: string) => montar(request(servidor).get(rota), token),
    post: (rota: string, corpo?: object, token?: string) =>
      montar(request(servidor).post(rota), token).send(corpo ?? {}),
    patch: (rota: string, corpo: object, token?: string) =>
      montar(request(servidor).patch(rota), token).send(corpo),
    put: (rota: string, corpo: object, token?: string) =>
      montar(request(servidor).put(rota), token).send(corpo),
    delete: (rota: string, token?: string) => montar(request(servidor).delete(rota), token),
    async entrar(email: string, senha: string): Promise<string> {
      const resposta = await montar(request(servidor).post("/auth/login")).send({ email, senha });
      if (resposta.status !== 200)
        throw new Error(`login falhou: ${resposta.status} ${resposta.text}`);
      return resposta.body.token as string;
    },
  };
}

export async function criarUsuario(
  app: INestApplication,
  perfil: PerfilUsuario,
  opcoes: { senha?: string; trocarSenha?: boolean } = {},
) {
  const prisma = app.get(PrismaService);
  const senha = opcoes.senha ?? SENHA_BOA;
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Teste ${perfil.toLowerCase()}`,
      email: novoEmail(perfil.toLowerCase()),
      perfil,
      senhaHash: await gerarHashSenha(senha),
      trocarSenha: opcoes.trocarSenha ?? false,
    },
  });
  return { ...usuario, senha };
}
