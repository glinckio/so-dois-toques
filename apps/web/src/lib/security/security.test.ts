import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { buildCsp, generateNonce, HASH_ESTILO_OCULTO } from "./csp";
import { securityHeaders } from "./headers";

describe("generateNonce", () => {
  it("FUND-CA-02: gera um nonce diferente a cada chamada", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => generateNonce()));
    expect(nonces.size).toBe(50);
  });

  it("gera 16 bytes em base64", () => {
    expect(atob(generateNonce())).toHaveLength(16);
  });
});

describe("buildCsp", () => {
  it("FUND-CA-02: em produção só permite scripts e estilos com o nonce", () => {
    const csp = buildCsp("abc123", { isDev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
  });

  it("VIVO-CA-11: em produção só libera o atributo display:none que o React usa ao transmitir SVG", () => {
    const csp = buildCsp("abc123", { isDev: false });
    const hash = `sha256-${createHash("sha256").update("display:none").digest("base64")}`;
    expect(HASH_ESTILO_OCULTO).toBe(hash);
    expect(csp).toContain(`style-src-attr 'unsafe-hashes' '${hash}'`);
    expect(csp.match(/sha256-/g)).toHaveLength(1);
  });

  it("FUND-CA-02: bloqueia iframes de terceiros e plugins", () => {
    const csp = buildCsp("abc123", { isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("em desenvolvimento libera o que o React precisa para depuração", () => {
    const csp = buildCsp("abc123", { isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe("securityHeaders", () => {
  it("FUND-CA-02: inclui HSTS, nosniff, bloqueio de iframe e política de referência", () => {
    const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));
    expect(byKey["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
