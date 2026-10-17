import { describe, expect, it } from "vitest";
import { cabecalhosDaMidia, fotoPermitida, nomeDoArquivo, origemConfere } from "./midia";

describe("CHAT-CA-10: entrega das mídias", () => {
  it("foto, vídeo e áudio abrem na página, com cache só no navegador", () => {
    const foto = cabecalhosDaMidia("image/jpeg", "ABC1", false);
    expect(foto.get("Content-Type")).toBe("image/jpeg");
    expect(foto.get("Content-Disposition")).toBe("inline");
    expect(foto.get("Cache-Control")).toBe("private, max-age=3600");
    expect(foto.get("Content-Security-Policy")).toContain("sandbox");
    expect(cabecalhosDaMidia("audio/ogg; codecs=opus", "ABC1", false).get("Content-Type")).toBe(
      "audio/ogg",
    );
  });

  it("documento, SVG e HTML só baixam, como binário", () => {
    for (const formato of ["application/pdf", "image/svg+xml", "text/html"]) {
      const c = cabecalhosDaMidia(formato, "ABC1", false);
      expect(c.get("Content-Type"), formato).toBe("application/octet-stream");
      expect(c.get("Content-Disposition"), formato).toMatch(
        /^attachment; filename="whatsapp-ABC1\./,
      );
    }
    expect(cabecalhosDaMidia("image/png", "ABC1", true).get("Content-Disposition")).toContain(
      "attachment",
    );
    expect(nomeDoArquivo("application/pdf", "AB/../C")).toBe("whatsapp-ABC.pdf");
    expect(nomeDoArquivo("x/y", "A1B2")).toBe("whatsapp-A1B2.bin");
  });

  it("o envio de arquivo só aceita pedido da própria origem", () => {
    const h = (cabecalhos: Record<string, string>) => new Headers(cabecalhos);
    expect(origemConfere(h({ origin: "https://sdt.exemplo.com", host: "sdt.exemplo.com" }))).toBe(
      true,
    );
    expect(
      origemConfere(
        h({
          origin: "https://sdt.exemplo.com",
          host: "interno:3000",
          "x-forwarded-host": "sdt.exemplo.com",
        }),
      ),
    ).toBe(true);
    expect(origemConfere(h({ origin: "https://malicioso.com", host: "sdt.exemplo.com" }))).toBe(
      false,
    );
    expect(origemConfere(h({ host: "sdt.exemplo.com" }))).toBe(false);
    expect(origemConfere(h({ origin: "null", host: "sdt.exemplo.com" }))).toBe(false);
  });

  it("foto de perfil só do CDN do WhatsApp, por https", () => {
    expect(fotoPermitida("https://pps.whatsapp.net/v/t61/foto.jpg")).toBe(true);
    expect(fotoPermitida("http://pps.whatsapp.net/foto.jpg")).toBe(false);
    expect(fotoPermitida("https://whatsapp.net.malicioso.com/foto.jpg")).toBe(false);
    expect(fotoPermitida("http://127.0.0.1/foto.jpg")).toBe(false);
    expect(fotoPermitida("lixo")).toBe(false);
  });
});
