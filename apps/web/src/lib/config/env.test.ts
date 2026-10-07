import { describe, expect, it } from "vitest";
import { lerEnvServidor } from "./env";

const chave = "k".repeat(32);
const exemplo = "troque-por-uma-chave-aleatoria-de-32-caracteres-ou-mais";

describe("lerEnvServidor", () => {
  it("LANC-CA-02: aceita chave gerada em produção", () => {
    expect(
      lerEnvServidor({
        NODE_ENV: "production",
        API_URL: "https://api.exemplo.com",
        INTERNAL_API_KEY: chave,
      }),
    ).toEqual({
      API_URL: "https://api.exemplo.com",
      INTERNAL_API_KEY: chave,
      IP_SALTOS_CONFIAVEIS: 1,
    });
  });

  it("LANC-CA-02: recusa a chave de exemplo em produção sem mostrar o valor", () => {
    expect(() => lerEnvServidor({ NODE_ENV: "production", INTERNAL_API_KEY: exemplo })).toThrow(
      "Variáveis de ambiente inválidas no web: INTERNAL_API_KEY",
    );
  });

  it("LANC-CA-02: fora de produção, a chave de exemplo serve para desenvolver", () => {
    expect(lerEnvServidor({ NODE_ENV: "development", INTERNAL_API_KEY: exemplo }).API_URL).toBe(
      "http://localhost:3001",
    );
  });

  it("lê quantos proxies ficam na frente do web", () => {
    expect(
      lerEnvServidor({ INTERNAL_API_KEY: chave, IP_SALTOS_CONFIAVEIS: "2" }).IP_SALTOS_CONFIAVEIS,
    ).toBe(2);
    expect(() => lerEnvServidor({ INTERNAL_API_KEY: chave, IP_SALTOS_CONFIAVEIS: "0" })).toThrow(
      "IP_SALTOS_CONFIAVEIS",
    );
  });

  it("recusa chave curta e URL inválida", () => {
    expect(() => lerEnvServidor({ INTERNAL_API_KEY: "curta", API_URL: "nada" })).toThrow(
      "API_URL, INTERNAL_API_KEY",
    );
  });
});
