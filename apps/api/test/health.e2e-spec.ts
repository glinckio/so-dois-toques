import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ENV } from "../src/config.module.js";
import { parseEnv, type Env } from "../src/env.js";
import { configureApp } from "../src/setup.js";

async function createApp(overrides: Partial<Env> = {}): Promise<INestApplication> {
  const env = { ...parseEnv(process.env), ...overrides };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, env);
  await app.init();
  return app;
}

describe("API com PostgreSQL real", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("FUND-CA-04: GET /health responde ok sem cache", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok", database: "ok" });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("FUND-CA-02: a API responde com cabeçalhos de segurança e sem X-Powered-By", async () => {
    const response = await request(app.getHttpServer()).get("/health");
    expect(response.headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("FUND-CA-02: CORS libera só a origem do front-end", async () => {
    const env = parseEnv(process.env);
    const allowed = await request(app.getHttpServer()).get("/health").set("Origin", env.WEB_ORIGIN);
    expect(allowed.headers["access-control-allow-origin"]).toBe(env.WEB_ORIGIN);

    const other = await request(app.getHttpServer())
      .get("/health")
      .set("Origin", "https://site-malicioso.example");
    expect(other.headers["access-control-allow-origin"]).not.toBe("https://site-malicioso.example");
  });

  it("rota inexistente responde 404 sem detalhes internos", async () => {
    const response = await request(app.getHttpServer()).get("/nao-existe").expect(404);
    expect(JSON.stringify(response.body)).not.toMatch(/stack|node_modules/);
  });
});

describe("API com banco indisponível", () => {
  it("FUND-CA-04: GET /health responde 503 sem expor o erro", async () => {
    const url = new URL(parseEnv(process.env).DATABASE_URL);
    url.pathname = "/banco_que_nao_existe";
    const app = await createApp({ DATABASE_URL: url.toString() });
    try {
      const response = await request(app.getHttpServer()).get("/health").expect(503);
      expect(response.body).toEqual({ status: "indisponivel", database: "indisponivel" });
    } finally {
      await app.close();
    }
  });
});
