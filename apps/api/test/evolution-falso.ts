// Microserviço do WhatsApp falso, em memória, para os testes de integração e de ponta a
// ponta (Etapa 20). Responde às rotas internas que a API usa, como o services/evolution
// responderia, e tem rotas /__teste para simular mensagens recebidas e a conexão.
// Roda também direto pelo Node: `node test/evolution-falso.ts` (porta em PORTA_EVOLUTION_FALSO).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type Registro = {
  key: { id: string; fromMe: boolean; remoteJid: string };
  pushName?: string;
  message: Record<string, unknown>;
  messageType: string;
  messageTimestamp: number;
  status?: string;
};

type Chamada = { metodo: string; caminho: string; corpo: unknown };

export type EvolutionFalso = {
  url: string;
  instancia: string;
  chamadas: Chamada[];
  estado: { existe: boolean; conexao: "open" | "close" | "connecting"; dono: string | null };
  receber(
    numero: string,
    conteudo: Record<string, unknown>,
    opcoes?: { nome?: string; id?: string },
  ): Registro;
  emitir(payload: unknown): void;
  reiniciar(): void;
  fechar(): Promise<void>;
};

/** Um PNG de 1×1 em base64: a "mídia" de qualquer mensagem. */
export const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const jid = (numero: string) => `${numero}@s.whatsapp.net`;
const agora = () => Math.floor(Date.now() / 1000);

export async function iniciarEvolutionFalso(opcoes: {
  chave: string;
  instancia?: string;
  porta?: number;
}): Promise<EvolutionFalso> {
  const instancia = opcoes.instancia ?? "so-dois-toques";
  const chamadas: Chamada[] = [];
  const estado: EvolutionFalso["estado"] = { existe: false, conexao: "close", dono: null };
  let registros: Registro[] = [];
  const nomes = new Map<string, string>();
  const naoLidas = new Map<string, number>();
  const ouvintes = new Set<ServerResponse>();
  let contador = 0;

  const emitir = (payload: unknown) => {
    for (const ouvinte of ouvintes) ouvinte.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const novoRegistro = (
    numero: string,
    fromMe: boolean,
    message: Record<string, unknown>,
    id?: string,
  ) => {
    contador += 1;
    const registro: Registro = {
      key: {
        id: id ?? `FALSO${String(contador).padStart(6, "0")}`,
        fromMe,
        remoteJid: jid(numero),
      },
      message,
      messageType: Object.keys(message)[0] ?? "conversation",
      messageTimestamp: agora(),
      status: fromMe ? "SERVER_ACK" : "DELIVERY_ACK",
    };
    registros.push(registro);
    return registro;
  };

  const receber: EvolutionFalso["receber"] = (numero, conteudo, extra = {}) => {
    if (extra.nome) nomes.set(numero, extra.nome);
    const registro = novoRegistro(numero, false, conteudo, extra.id);
    registro.pushName = extra.nome ?? nomes.get(numero);
    naoLidas.set(numero, (naoLidas.get(numero) ?? 0) + 1);
    emitir({ event: "messages.upsert", instance: instancia, data: registro });
    return registro;
  };

  const enviar = (corpo: Record<string, unknown>, message: Record<string, unknown>) => {
    const numero = typeof corpo["number"] === "string" ? corpo["number"] : "";
    const citada = (corpo["quoted"] as { key?: { id?: string } } | undefined)?.key?.id;
    if (citada) {
      const tipo = Object.keys(message)[0]!;
      const conteudo = (message[tipo] ?? {}) as Record<string, unknown>;
      const original = registros.find((r) => r.key.id === citada);
      const contexto = { stanzaId: citada, quotedMessage: original?.message ?? {} };
      if (tipo === "conversation") {
        message = { extendedTextMessage: { text: message["conversation"], contextInfo: contexto } };
      } else {
        message = { [tipo]: { ...conteudo, contextInfo: contexto } };
      }
    }
    const registro = novoRegistro(numero, true, message);
    emitir({ event: "send.message", instance: instancia, data: registro });
    return registro;
  };

  const ler = (req: IncomingMessage) =>
    new Promise<unknown>((resolve) => {
      let dados = "";
      req.on("data", (pedaco: Buffer) => (dados += pedaco.toString()));
      req.on("end", () => {
        try {
          resolve(dados ? JSON.parse(dados) : undefined);
        } catch {
          resolve(undefined);
        }
      });
    });

  const responder = (res: ServerResponse, status: number, corpo?: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(corpo === undefined ? "" : JSON.stringify(corpo));
  };

  const conversas = () => {
    const numeros = [...new Set(registros.map((r) => r.key.remoteJid))];
    return numeros.map((remoteJid) => {
      const numero = remoteJid.split("@")[0]!;
      const ultima = registros.filter((r) => r.key.remoteJid === remoteJid).at(-1)!;
      return {
        id: remoteJid,
        remoteJid,
        pushName: nomes.get(numero) ?? null,
        profilePicUrl: null,
        unreadCount: naoLidas.get(numero) ?? 0,
        updatedAt: new Date(ultima.messageTimestamp * 1000).toISOString(),
        lastMessage: ultima,
      };
    });
  };

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const caminho = url.pathname;
    const corpo = (await ler(req)) as Record<string, unknown> | undefined;

    // Controle dos testes.
    if (caminho.startsWith("/__teste/")) {
      if (caminho === "/__teste/saude") return responder(res, 200, { ok: true });
      if (caminho === "/__teste/receber") {
        const c = corpo ?? {};
        const registro = receber(
          String(c["numero"]),
          (c["conteudo"] ?? { conversation: c["texto"] }) as Record<string, unknown>,
          {
            nome: c["nome"] as string | undefined,
          },
        );
        return responder(res, 201, registro);
      }
      if (caminho === "/__teste/conectar") {
        estado.existe = true;
        estado.conexao = "open";
        estado.dono = "5551988887777";
        emitir({ event: "connection.update", instance: instancia, data: { state: "open" } });
        return responder(res, 200, { ok: true });
      }
      if (caminho === "/__teste/reiniciar") {
        reiniciar();
        return responder(res, 200, { ok: true });
      }
      return responder(res, 404, { message: "Not found" });
    }

    if (req.headers["x-internal-api-key"] !== opcoes.chave) {
      return responder(res, 401, { message: "Invalid or missing internal API key" });
    }
    chamadas.push({ metodo: req.method ?? "GET", caminho, corpo });

    const base = "/internal/evolution";
    const rota = `${req.method} ${caminho.startsWith(base) ? caminho.slice(base.length) : caminho}`;
    const inst = encodeURIComponent(instancia);

    if (rota === "GET /events/stream") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      res.write(": conectado\n\n");
      ouvintes.add(res);
      req.on("close", () => ouvintes.delete(res));
      return;
    }
    if (rota === "GET /instance/fetchInstances") {
      return responder(
        res,
        200,
        estado.existe
          ? [
              {
                name: instancia,
                connectionStatus: estado.conexao,
                ownerJid: estado.dono ? jid(estado.dono) : null,
                profileName: estado.dono ? "Só Dois Toques" : null,
              },
            ]
          : [],
      );
    }
    if (rota === "POST /instance") {
      estado.existe = true;
      return responder(res, 201, { instance: { instanceName: instancia, status: "created" } });
    }
    if (rota === `GET /instance/connect/${inst}`) {
      if (!estado.existe) return responder(res, 404, { message: "Instance not found" });
      estado.conexao = "connecting";
      return responder(res, 200, {
        base64: `data:image/png;base64,${PNG_1X1}`,
        code: "2@falso",
        count: 1,
      });
    }
    if (rota === `DELETE /instance/logout/${inst}`) {
      if (!estado.existe) return responder(res, 404, { message: "Instance not found" });
      estado.conexao = "close";
      estado.dono = null;
      return responder(res, 200, { status: "SUCCESS" });
    }
    if (rota === `GET /chat/chats/${inst}`) {
      // Um grupo também aparece no Evolution: a API precisa deixá-lo de fora.
      return responder(res, 200, [
        ...conversas(),
        { id: "1203630000@g.us", remoteJid: "1203630000@g.us", pushName: "Grupo" },
      ]);
    }
    if (rota === `GET /chat/messages/${inst}`) {
      const onde = JSON.parse(url.searchParams.get("where") ?? "{}") as { remoteJid?: string };
      const porPagina = Number(url.searchParams.get("offset") ?? 50);
      const pagina = Number(url.searchParams.get("page") ?? 1);
      const daConversa = registros.filter((r) => r.key.remoteJid === onde.remoteJid).reverse();
      const records = daConversa.slice((pagina - 1) * porPagina, pagina * porPagina);
      return responder(res, 200, {
        messages: {
          total: daConversa.length,
          pages: Math.max(1, Math.ceil(daConversa.length / porPagina)),
          currentPage: pagina,
          records,
        },
      });
    }
    if (rota === "POST /chat/mark-as-read") {
      const lidas = (corpo?.["readMessages"] ?? []) as { remoteJid: string }[];
      for (const l of lidas) naoLidas.set(l.remoteJid.split("@")[0]!, 0);
      return responder(res, 201, { message: "Read messages", read: "success" });
    }
    if (rota === "POST /chat/whatsapp-numbers") {
      const numeros = (corpo?.["numbers"] ?? []) as string[];
      // Números terminados em 000 "não têm WhatsApp".
      return responder(
        res,
        200,
        numeros.map((n) => ({ exists: !n.endsWith("000"), jid: jid(n), number: n })),
      );
    }
    if (rota === `POST /chat/base64-media/${inst}`) {
      const id = (corpo?.["message"] as { key?: { id?: string } })?.key?.id ?? "";
      const registro = registros.find((r) => r.key.id === id);
      if (!registro) return responder(res, 400, { message: "Message not found" });
      return responder(res, 200, { base64: PNG_1X1, mimetype: "image/png" });
    }
    if (rota === `GET /chat/profile-picture/${inst}`) {
      return responder(res, 200, { profilePictureUrl: null });
    }
    if (rota === "POST /message/send-text") {
      return responder(res, 201, enviar(corpo!, { conversation: corpo!["text"] }));
    }
    if (rota === "POST /message/send-media") {
      const tipo =
        corpo!["mediatype"] === "image"
          ? "imageMessage"
          : corpo!["mediatype"] === "video"
            ? "videoMessage"
            : "documentMessage";
      return responder(
        res,
        201,
        enviar(corpo!, {
          [tipo]: {
            caption: corpo!["caption"],
            mimetype: corpo!["mimetype"],
            fileName: corpo!["fileName"],
          },
        }),
      );
    }
    if (rota === "POST /message/send-audio") {
      return responder(
        res,
        201,
        enviar(corpo!, { audioMessage: { mimetype: "audio/ogg; codecs=opus", ptt: true } }),
      );
    }
    if (rota === "POST /message/send-sticker") {
      return responder(res, 201, enviar(corpo!, { stickerMessage: { mimetype: "image/webp" } }));
    }
    if (rota === "POST /message/send-reaction") {
      const numero = String(corpo!["remoteJid"]).split("@")[0]!;
      return responder(
        res,
        201,
        enviar(
          { number: numero },
          { reactionMessage: { key: { id: corpo!["messageId"] }, text: corpo!["reaction"] } },
        ),
      );
    }
    return responder(res, 404, { message: `Rota falsa não existe: ${rota}` });
  });

  function reiniciar() {
    registros = [];
    nomes.clear();
    naoLidas.clear();
    chamadas.length = 0;
    estado.existe = false;
    estado.conexao = "close";
    estado.dono = null;
  }

  await new Promise<void>((resolve) => servidor.listen(opcoes.porta ?? 0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  const porta = typeof endereco === "object" && endereco ? endereco.port : 0;

  return {
    url: `http://127.0.0.1:${porta}`,
    instancia,
    chamadas,
    estado,
    receber,
    emitir,
    reiniciar,
    fechar: () =>
      new Promise<void>((resolve) => {
        for (const ouvinte of ouvintes) ouvinte.end();
        servidor.close(() => resolve());
        servidor.closeAllConnections();
      }),
  };
}

// Execução direta (testes de ponta a ponta do web).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("test/evolution-falso.ts")) {
  const porta = Number(process.env["PORTA_EVOLUTION_FALSO"] ?? 3104);
  const chave = process.env["CHAVE_EVOLUTION_FALSO"] ?? "chave-do-evolution-falso-dos-testes-0000";
  await iniciarEvolutionFalso({ chave, porta });
  console.log(`Evolution falso em http://127.0.0.1:${porta}`);
}
