import "reflect-metadata";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { InternalApiGuard } from "../src/common/guards/internal-api.guard";
import { WebhookTokenGuard } from "../src/common/guards/webhook-token.guard";
import { validarEnv } from "../src/env";
import { semToken, urlDoWebhook } from "../src/webhook/url";

const CHAVE = "chave-interna-de-teste-com-mais-de-32-caracteres";
const TOKEN = "token-do-webhook-de-teste-com-mais-de-32-caracteres";

const config = {
  get: (nome: string) => ({ INTERNAL_API_KEY: CHAVE, WEBHOOK_TOKEN: TOKEN })[nome],
} as ConfigService;

function contexto(req: { headers?: Record<string, unknown>; query?: Record<string, unknown> }) {
  const request = { headers: {}, query: {}, ...req };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

const envValido = {
  INTERNAL_API_KEY: CHAVE,
  EVOLUTION_API_URL: "http://localhost:8080",
  EVOLUTION_API_KEY: "chave-do-evolution",
  WEBHOOK_TOKEN: TOKEN,
};

describe("CHAT-CA-01: variáveis do microserviço", () => {
  it("aceita a configuração completa, com porta padrão 3004", () => {
    expect(validarEnv(envValido)).toMatchObject({
      PORT: 3004,
      EVOLUTION_API_URL: "http://localhost:8080",
    });
  });

  it("recusa iniciar sem a chave interna ou com chave curta, citando só o nome", () => {
    const { INTERNAL_API_KEY: _, ...semChave } = envValido;
    expect(() => validarEnv(semChave)).toThrow("Variáveis de ambiente inválidas: INTERNAL_API_KEY");
    try {
      validarEnv({ ...envValido, INTERNAL_API_KEY: "curta-demais" });
      expect.unreachable();
    } catch (erro) {
      expect(String(erro)).toContain("INTERNAL_API_KEY");
      expect(String(erro)).not.toContain("curta-demais");
    }
  });

  it("recusa sem o token do webhook e sem o endereço do Evolution", () => {
    expect(() => validarEnv({ ...envValido, WEBHOOK_TOKEN: "" })).toThrow("WEBHOOK_TOKEN");
    expect(() => validarEnv({ ...envValido, EVOLUTION_API_URL: "nao-e-url" })).toThrow(
      "EVOLUTION_API_URL",
    );
  });
});

describe("CHAT-CA-02: chave interna e token do webhook", () => {
  it("rotas internas recusam chamada sem a chave ou com a chave errada", () => {
    const guarda = new InternalApiGuard(config);
    expect(guarda.canActivate(contexto({ headers: { "x-internal-api-key": CHAVE } }))).toBe(true);
    expect(() => guarda.canActivate(contexto({}))).toThrow(UnauthorizedException);
    expect(() =>
      guarda.canActivate(contexto({ headers: { "x-internal-api-key": `${CHAVE}x` } })),
    ).toThrow(UnauthorizedException);
  });

  it("o webhook recusa chamada sem o token ou com o token errado", () => {
    const guarda = new WebhookTokenGuard(config);
    expect(guarda.canActivate(contexto({ query: { token: TOKEN } }))).toBe(true);
    expect(() => guarda.canActivate(contexto({}))).toThrow(UnauthorizedException);
    expect(() => guarda.canActivate(contexto({ query: { token: "errado" } }))).toThrow(
      UnauthorizedException,
    );
    expect(() => guarda.canActivate(contexto({ query: { token: [TOKEN, TOKEN] } }))).toThrow(
      UnauthorizedException,
    );
  });

  it("o webhook automático da instância já vai com o token", () => {
    expect(urlDoWebhook("http://host.docker.internal:3004/", "a b")).toBe(
      "http://host.docker.internal:3004/evolution/webhook?token=a%20b",
    );
    expect(urlDoWebhook(undefined, TOKEN)).toBeNull();
    // O log do webhook nunca mostra o token.
    expect(semToken(`http://x:3004/evolution/webhook?token=${TOKEN}`)).toBe(
      "http://x:3004/evolution/webhook",
    );
    expect(urlDoWebhook("http://x", undefined)).toBeNull();
  });
});
