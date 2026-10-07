import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contraste, CORES } from "./tema";

describe("tema", () => {
  it("calcula o contraste como a WCAG", () => {
    expect(contraste("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contraste("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contraste("#123456", "#123456")).toBe(1);
  });

  it("VIS-CA-01: texto principal, secundário e apagado passam de 4,5:1 sobre fundo, cartão e elevado", () => {
    for (const superficie of [CORES.fundo, CORES.cartao, CORES.elevado]) {
      for (const texto of [CORES.texto, CORES.suave, CORES.apagado, CORES.roxo, CORES.ouro]) {
        expect(contraste(texto, superficie), `${texto} sobre ${superficie}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      for (const status of [CORES.sucesso, CORES.perigo]) {
        expect(contraste(status, superficie)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("VIS-CA-01: texto dos botões passa de 4,5:1 (branco no roxo, fundo no dourado)", () => {
    expect(contraste("#ffffff", CORES["roxo-forte"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(CORES.fundo, CORES.ouro)).toBeGreaterThanOrEqual(4.5);
  });

  it("VIS-CA-01: séries dos gráficos passam de 3:1 sobre o cartão", () => {
    expect(contraste(CORES["serie-1"], CORES.cartao)).toBeGreaterThanOrEqual(3);
    expect(contraste(CORES["serie-2"], CORES.cartao)).toBeGreaterThanOrEqual(3);
  });

  it("VIS-CA-01: o CSS usa as mesmas cores", () => {
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
    for (const [nome, valor] of Object.entries(CORES)) {
      expect(css).toContain(`--color-${nome}: ${valor};`);
    }
  });
});
