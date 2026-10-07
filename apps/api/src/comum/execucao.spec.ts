import { ehExecucaoDireta } from "./execucao.js";

describe("ehExecucaoDireta", () => {
  it("ACESSO-CA-21: reconhece o script chamado direto no Windows", () => {
    expect(
      ehExecucaoDireta(
        "file:///E:/Code/so-dois-toques/apps/api/dist/cli/criar-admin.js",
        "E:\\Code\\so-dois-toques\\apps\\api\\dist\\cli\\criar-admin.js",
        true,
      ),
    ).toBe(true);
  });

  it("ACESSO-CA-21: reconhece o script no Linux e no macOS, inclusive com espaço no caminho", () => {
    expect(
      ehExecucaoDireta(
        "file:///home/ana/meus%20projetos/api/dist/cli/criar-admin.js",
        "/home/ana/meus projetos/api/dist/cli/criar-admin.js",
        false,
      ),
    ).toBe(true);
  });

  it("não roda quando o módulo é importado por outro arquivo", () => {
    expect(
      ehExecucaoDireta(
        "file:///app/dist/cli/criar-admin.js",
        "/app/node_modules/vitest/cli.js",
        false,
      ),
    ).toBe(false);
    expect(ehExecucaoDireta("file:///app/dist/cli/criar-admin.js", undefined, false)).toBe(false);
  });
});
