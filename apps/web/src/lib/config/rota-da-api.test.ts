import { describe, expect, it } from "vitest";
import { urlDaApi } from "./rota-da-api";

describe("CHAT-CA-10: o servidor do web só chama a própria API", () => {
  it("monta o endereço da rota no host da API", () => {
    expect(urlDaApi("http://sdt_api:3001", "/chat/midias/ABC1?numero=5551999998888")).toBe(
      "http://sdt_api:3001/chat/midias/ABC1?numero=5551999998888",
    );
    expect(urlDaApi("http://sdt_api:3001/qualquer", "/health")).toBe("http://sdt_api:3001/health");
  });

  it("recusa endereço absoluto, // e caminho sem barra", () => {
    for (const rota of [
      "http://malicioso.com/x",
      "//malicioso.com/x",
      "/\\malicioso.com",
      "chat/conversas",
      "/chat/ conversas",
    ]) {
      expect(() => urlDaApi("http://sdt_api:3001", rota), rota).toThrow("Rota da API inválida");
    }
  });
});
