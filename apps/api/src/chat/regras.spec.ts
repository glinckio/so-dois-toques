import { describe, expect, it } from "vitest";
import {
  ARQUIVO_MAXIMO_BYTES,
  contatoCombina,
  contatoDoEvolution,
  bytesDoBase64,
  conversaDoEvolution,
  estadoDe,
  eventoDoWebhook,
  formatarNumero,
  jidDoNumero,
  lerBlocosSse,
  mensagemDoEvolution,
  numeroCompleto,
  numeroDoJid,
  ordenarConversas,
  problemaDoArquivo,
  resumoDaMensagem,
  situacaoDe,
  telefonesParecidos,
} from "./regras.js";

const JID = "5551999998888@s.whatsapp.net";

const registro = (message: unknown, extra: Record<string, unknown> = {}) => ({
  key: { id: "ABC", fromMe: false, remoteJid: JID },
  pushName: "Ana",
  message,
  messageTimestamp: 1_760_000_000,
  ...extra,
});

describe("CHAT-CA-11: números", () => {
  it("completa o número digitado com DDD e recusa o que não é telefone", () => {
    expect(numeroCompleto("(51) 99999-8888")).toBe("5551999998888");
    expect(numeroCompleto("51 3333-4444")).toBe("555133334444");
    expect(numeroCompleto("+55 51 99999-8888")).toBe("5551999998888");
    expect(numeroCompleto("123")).toBeNull();
    expect(jidDoNumero("5551999998888")).toBe(JID);
  });

  it("formata o número para mostrar", () => {
    expect(formatarNumero("5551999998888")).toBe("+55 (51) 99999-8888");
    expect(formatarNumero("555199998888")).toBe("+55 (51) 9999-8888");
    expect(formatarNumero("14155550123")).toBe("+14155550123");
  });
});

describe("CHAT-CA-04: só conversas individuais e o aluno pelo telefone", () => {
  it("aceita só @s.whatsapp.net; grupo, status, broadcast e @lid ficam de fora", () => {
    expect(numeroDoJid(JID)).toBe("5551999998888");
    expect(numeroDoJid("5551999998888:12@s.whatsapp.net")).toBe("5551999998888");
    expect(numeroDoJid("120363000000000000@g.us")).toBeNull();
    expect(numeroDoJid("status@broadcast")).toBeNull();
    expect(numeroDoJid("123456789@lid")).toBeNull();
    expect(numeroDoJid(undefined)).toBeNull();
  });

  it("acha o telefone do cadastro com e sem o nono dígito", () => {
    expect(telefonesParecidos("5551999998888")).toEqual(["51999998888", "5199998888"]);
    expect(telefonesParecidos("555199998888")).toEqual(["5199998888", "51999998888"]);
    expect(telefonesParecidos("555133334444")).toEqual(["5133334444"]);
    expect(telefonesParecidos("14155550123")).toEqual([]);
  });

  it("traduz a conversa com última mensagem, não lidas e nome", () => {
    const conversa = conversaDoEvolution({
      remoteJid: JID,
      pushName: "Ana",
      profilePicUrl: "https://pps.whatsapp.net/foto.jpg",
      unreadCount: 2,
      lastMessage: registro({ conversation: "Oi!" }),
    });
    expect(conversa).toEqual({
      numero: "5551999998888",
      nome: "Ana",
      temFoto: true,
      naoLidas: 2,
      ultima: { resumo: "Oi!", deMim: false, enviadaEm: "2025-10-09T08:53:20.000Z" },
    });
    expect(conversaDoEvolution({ remoteJid: "1203@g.us" })).toBeNull();
    expect(
      conversaDoEvolution({ remoteJid: JID, updatedAt: "2026-01-01T00:00:00.000Z" })?.ultima,
    ).toEqual({
      resumo: "",
      deMim: false,
      enviadaEm: "2026-01-01T00:00:00.000Z",
    });
  });

  it("ordena da mais recente para a mais antiga, sem mensagem no fim", () => {
    const c = (numero: string, enviadaEm?: string) => ({
      numero,
      nome: null,
      temFoto: false,
      naoLidas: 0,
      ultima: enviadaEm ? { resumo: "", deMim: false, enviadaEm } : null,
    });
    const ordem = ordenarConversas([c("1"), c("2", "2026-01-01"), c("3", "2026-02-01")]);
    expect(ordem.map((x) => x.numero)).toEqual(["3", "2", "1"]);
  });
});

describe("CHAT-CA-07: mensagens recebidas com o tipo certo", () => {
  it("texto simples e texto com citação", () => {
    expect(mensagemDoEvolution(registro({ conversation: "Oi 😀" }))).toMatchObject({
      id: "ABC",
      numero: "5551999998888",
      deMim: false,
      tipo: "texto",
      texto: "Oi 😀",
      citada: null,
      nomeContato: "Ana",
    });
    const citando = mensagemDoEvolution(
      registro({
        extendedTextMessage: {
          text: "Combinado",
          contextInfo: { stanzaId: "XYZ", quotedMessage: { conversation: "Aula às 19h?" } },
        },
      }),
    );
    expect(citando).toMatchObject({
      texto: "Combinado",
      citada: { id: "XYZ", texto: "Aula às 19h?" },
    });
  });

  it("mídias com legenda, formato e duração", () => {
    expect(
      mensagemDoEvolution(
        registro({ imageMessage: { caption: "Treino", mimetype: "image/jpeg" } }),
      ),
    ).toMatchObject({ tipo: "imagem", texto: "Treino", midia: { mimetype: "image/jpeg" } });
    expect(mensagemDoEvolution(registro({ videoMessage: { mimetype: "video/mp4" } }))?.tipo).toBe(
      "video",
    );
    expect(
      mensagemDoEvolution(registro({ audioMessage: { mimetype: "audio/ogg", seconds: 7 } })),
    ).toMatchObject({ tipo: "audio", midia: { segundos: 7 } });
    expect(
      mensagemDoEvolution(
        registro({
          documentWithCaptionMessage: {
            message: { documentMessage: { fileName: "ficha.pdf", mimetype: "application/pdf" } },
          },
        }),
      ),
    ).toMatchObject({ tipo: "documento", midia: { nomeArquivo: "ficha.pdf" } });
    expect(
      mensagemDoEvolution(registro({ stickerMessage: { mimetype: "image/webp" } }))?.tipo,
    ).toBe("figurinha");
    expect(
      mensagemDoEvolution(registro({ ephemeralMessage: { message: { conversation: "sumirá" } } })),
    ).toMatchObject({ tipo: "texto", texto: "sumirá" });
  });

  it("localização, contato e reação", () => {
    expect(
      mensagemDoEvolution(
        registro({
          locationMessage: { degreesLatitude: -29.76, degreesLongitude: -51.14, name: "Quadra" },
        }),
      ),
    ).toMatchObject({ tipo: "localizacao", texto: "Quadra · -29.76, -51.14" });
    expect(mensagemDoEvolution(registro({ contactMessage: { displayName: "Bia" } }))).toMatchObject(
      {
        tipo: "contato",
        texto: "Bia",
      },
    );
    expect(
      mensagemDoEvolution(
        registro({
          contactsArrayMessage: { contacts: [{ displayName: "Bia" }, { displayName: "Caio" }] },
        }),
      )?.texto,
    ).toBe("Bia, Caio");
    expect(
      mensagemDoEvolution(registro({ reactionMessage: { key: { id: "XYZ" }, text: "❤️" } })),
    ).toMatchObject({ tipo: "reacao", reacao: { alvoId: "XYZ", emoji: "❤️" } });
  });

  it("tipo desconhecido vira não suportada; registro sem chave ou de grupo é ignorado", () => {
    expect(mensagemDoEvolution(registro({ pollCreationMessage: {} }))?.tipo).toBe("nao_suportada");
    expect(mensagemDoEvolution(registro(undefined))?.tipo).toBe("nao_suportada");
    expect(mensagemDoEvolution({ message: { conversation: "x" } })).toBeNull();
    expect(
      mensagemDoEvolution({
        key: { id: "1", remoteJid: "1203@g.us" },
        message: { conversation: "x" },
      }),
    ).toBeNull();
  });

  it("usa o número alternativo quando o contato chega como @lid", () => {
    const m = mensagemDoEvolution({
      key: { id: "L1", fromMe: false, remoteJid: "999@lid", remoteJidAlt: JID },
      message: { conversation: "oi" },
    });
    expect(m?.numero).toBe("5551999998888");
  });

  it("situação de entrega pelo texto do Evolution, pelo número do Baileys ou pela última atualização", () => {
    expect(situacaoDe("DELIVERY_ACK")).toBe("ENTREGUE");
    expect(situacaoDe("READ")).toBe("LIDA");
    expect(situacaoDe(2)).toBe("ENVIADA");
    expect(situacaoDe("OUTRO")).toBeNull();
    const enviada = mensagemDoEvolution(
      registro(
        { conversation: "oi" },
        {
          key: { id: "E1", fromMe: true, remoteJid: JID },
          status: "SERVER_ACK",
          MessageUpdate: [{ status: "DELIVERY_ACK" }, { status: "READ" }],
          messageTimestamp: { low: 1_760_000_000, high: 0 },
        },
      ),
    );
    expect(enviada).toMatchObject({ deMim: true, situacao: "LIDA", nomeContato: null });
    expect(enviada?.enviadaEm).toBe("2025-10-09T08:53:20.000Z");
  });

  it("resume cada tipo para a lista de conversas", () => {
    expect(resumoDaMensagem({ tipo: "texto", texto: "Oi", reacao: null })).toBe("Oi");
    expect(resumoDaMensagem({ tipo: "imagem", texto: null, reacao: null })).toBe("📷 Foto");
    expect(resumoDaMensagem({ tipo: "imagem", texto: "Treino", reacao: null })).toBe(
      "📷 Foto: Treino",
    );
    expect(
      resumoDaMensagem({ tipo: "reacao", texto: null, reacao: { alvoId: "1", emoji: "👍" } }),
    ).toBe("Reagiu 👍");
    expect(resumoDaMensagem({ tipo: "nao_suportada", texto: null, reacao: null })).toBe(
      "Mensagem não suportada",
    );
  });
});

describe("CHAT-CA-06: arquivos aceitos", () => {
  const base64 = (bytes: number) => Buffer.alloc(bytes, 1).toString("base64");

  it("calcula o tamanho real do base64", () => {
    expect(bytesDoBase64(base64(10))).toBe(10);
    expect(bytesDoBase64(base64(11))).toBe(11);
    expect(bytesDoBase64(base64(12))).toBe(12);
  });

  it("aceita formatos da lista até 10 MB", () => {
    expect(problemaDoArquivo("imagem", "image/jpeg", base64(100))).toBeNull();
    expect(problemaDoArquivo("audio", "audio/webm;codecs=opus", base64(100))).toBeNull();
    expect(
      problemaDoArquivo("documento", "application/pdf", base64(ARQUIVO_MAXIMO_BYTES)),
    ).toBeNull();
  });

  it("recusa acima de 10 MB, formato fora da lista e base64 inválido", () => {
    expect(problemaDoArquivo("video", "video/mp4", base64(ARQUIVO_MAXIMO_BYTES + 1))).toBe(
      "O arquivo passa de 10 MB.",
    );
    expect(problemaDoArquivo("imagem", "image/gif", base64(10))).toBe(
      "Tipo de arquivo não aceito.",
    );
    expect(problemaDoArquivo("documento", "application/x-msdownload", base64(10))).toBe(
      "Tipo de arquivo não aceito.",
    );
    expect(problemaDoArquivo("imagem", "image/png", "não é base64")).toBe("Arquivo inválido.");
    expect(problemaDoArquivo("imagem", "image/png", "")).toBe("Arquivo inválido.");
  });
});

describe("CHAT-CA-08: eventos do webhook", () => {
  const INSTANCIA = "so-dois-toques";

  it("mensagem nova e enviada viram evento de mensagem", () => {
    const evento = eventoDoWebhook(
      { event: "messages.upsert", instance: INSTANCIA, data: registro({ conversation: "Oi" }) },
      INSTANCIA,
    );
    expect(evento).toMatchObject({
      tipo: "mensagem",
      mensagem: { texto: "Oi", numero: "5551999998888" },
    });
    expect(
      eventoDoWebhook(
        { event: "SEND_MESSAGE", instance: INSTANCIA, data: registro({ conversation: "x" }) },
        INSTANCIA,
      )?.tipo,
    ).toBe("mensagem");
    expect(
      eventoDoWebhook(
        {
          event: "messages.upsert",
          instance: INSTANCIA,
          data: { messages: [registro({ conversation: "y" })] },
        },
        INSTANCIA,
      ),
    ).toMatchObject({ mensagem: { texto: "y" } });
  });

  it("situação, conexão e QR code", () => {
    expect(
      eventoDoWebhook(
        {
          event: "messages.update",
          instance: INSTANCIA,
          data: { keyId: "ABC", remoteJid: JID, status: "READ" },
        },
        INSTANCIA,
      ),
    ).toEqual({ tipo: "situacao", numero: "5551999998888", mensagemId: "ABC", situacao: "LIDA" });
    expect(
      eventoDoWebhook(
        { event: "connection.update", instance: INSTANCIA, data: { state: "open" } },
        INSTANCIA,
      ),
    ).toEqual({ tipo: "conexao", estado: "CONECTADO" });
    expect(
      eventoDoWebhook(
        {
          event: "qrcode.updated",
          instance: INSTANCIA,
          data: { qrcode: { base64: "data:image/png;base64,AA==" } },
        },
        INSTANCIA,
      ),
    ).toEqual({ tipo: "qrcode", base64: "data:image/png;base64,AA==" });
    expect(estadoDe("close")).toBe("DESCONECTADO");
    expect(estadoDe("connecting")).toBe("CONECTANDO");
  });

  it("ignora outra instância, grupo, evento que a tela não usa e o keepalive", () => {
    expect(
      eventoDoWebhook(
        { event: "messages.upsert", instance: "outra", data: registro({ conversation: "Oi" }) },
        INSTANCIA,
      ),
    ).toBeNull();
    expect(
      eventoDoWebhook(
        {
          event: "messages.upsert",
          instance: INSTANCIA,
          data: { key: { id: "1", remoteJid: "1203@g.us" }, message: { conversation: "x" } },
        },
        INSTANCIA,
      ),
    ).toBeNull();
    expect(
      eventoDoWebhook({ event: "presence.update", instance: INSTANCIA, data: {} }, INSTANCIA),
    ).toBeNull();
    expect(eventoDoWebhook({ type: "keepalive" }, INSTANCIA)).toBeNull();
  });

  it("lê blocos de SSE completos e guarda o resto", () => {
    expect(lerBlocosSse('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"')).toEqual({
      dados: ['{"a":1}', '{"b":2}'],
      resto: 'data: {"c"',
    });
    expect(lerBlocosSse(": comentario\n\nid: 1\r\ndata: x\r\n\r\n")).toEqual({
      dados: ["x"],
      resto: "",
    });
  });
});

describe("CHAT-CA-14: contatos da janela de nova conversa", () => {
  it("traduz contatos do WhatsApp e deixa grupo e @lid de fora", () => {
    expect(contatoDoEvolution({ remoteJid: JID, pushName: "Ana" })).toEqual({
      numero: "5551999998888",
      nome: "Ana",
    });
    expect(contatoDoEvolution({ remoteJid: JID })).toEqual({ numero: "5551999998888", nome: null });
    expect(contatoDoEvolution({ remoteJid: "1203@g.us", pushName: "Grupo" })).toBeNull();
    expect(contatoDoEvolution({ remoteJid: "9@lid" })).toBeNull();
  });

  it("busca por nome sem acento ou por parte do número", () => {
    const c = { numero: "5551999998888", nome: "João Pedro" };
    expect(contatoCombina(c, "")).toBe(true);
    expect(contatoCombina(c, "joao")).toBe(true);
    expect(contatoCombina(c, "8888")).toBe(true);
    expect(contatoCombina(c, "88")).toBe(false);
    expect(contatoCombina({ numero: "1", nome: null }, "ana")).toBe(false);
  });
});
