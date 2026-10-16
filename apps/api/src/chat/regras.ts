// Etapa 20: regras puras do chat do WhatsApp. Tudo o que vem do Evolution chega como
// `unknown` e é lido com cuidado: um campo faltando vira "não suportada", nunca erro.

// ---------------------------------------------------------------- números

const SUFIXO_INDIVIDUAL = "@s.whatsapp.net";

/** Número da conversa: só dígitos, com o código do país (55…). */
export const NUMERO_VALIDO = /^\d{10,15}$/;

/**
 * CHAT-CA-11: número digitado (com DDD, com ou sem 55) vira o número completo.
 * Devolve `null` se não parece um telefone.
 */
export function numeroCompleto(digitado: string): string | null {
  const digitos = digitado.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return NUMERO_VALIDO.test(digitos) ? digitos : null;
}

export function jidDoNumero(numero: string): string {
  return `${numero}${SUFIXO_INDIVIDUAL}`;
}

/**
 * CHAT-CA-04: só conversas individuais. Grupo (@g.us), status, broadcast e contato que
 * ainda aparece como @lid (sem número) ficam de fora.
 */
export function numeroDoJid(jid: unknown): string | null {
  if (typeof jid !== "string" || !jid.endsWith(SUFIXO_INDIVIDUAL)) return null;
  const numero = jid.slice(0, -SUFIXO_INDIVIDUAL.length).split(":")[0]!;
  return NUMERO_VALIDO.test(numero) ? numero : null;
}

/**
 * CHAT-CA-04: telefones do cadastro (DDD + número, sem o 55) que podem ser este número.
 * Contas antigas do WhatsApp no Brasil não têm o nono dígito; o cadastro pode ter.
 */
export function telefonesParecidos(numero: string): string[] {
  if (!numero.startsWith("55")) return [];
  const local = numero.slice(2);
  if (local.length === 10 && /^[6-9]$/.test(local[2]!)) {
    return [local, `${local.slice(0, 2)}9${local.slice(2)}`];
  }
  if (local.length === 11 && local[2] === "9")
    return [local, `${local.slice(0, 2)}${local.slice(3)}`];
  return local.length === 10 || local.length === 11 ? [local] : [];
}

/** "+55 (51) 99999-8888" para mostrar o número quando não há nome. */
export function formatarNumero(numero: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(numero);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${numero}`;
}

// ---------------------------------------------------------------- mensagens

export const TIPOS_DE_MENSAGEM = [
  "texto",
  "imagem",
  "video",
  "audio",
  "documento",
  "figurinha",
  "localizacao",
  "contato",
  "reacao",
  "nao_suportada",
] as const;
export type TipoDeMensagem = (typeof TIPOS_DE_MENSAGEM)[number];

export type Situacao = "ERRO" | "PENDENTE" | "ENVIADA" | "ENTREGUE" | "LIDA";

export type Mensagem = {
  id: string;
  numero: string;
  deMim: boolean;
  tipo: TipoDeMensagem;
  /** Texto, legenda da mídia, descrição da localização ou nome do contato. */
  texto: string | null;
  midia: { mimetype: string | null; nomeArquivo: string | null; segundos: number | null } | null;
  citada: { id: string; texto: string | null } | null;
  /** Só nas reações: a mensagem reagida e o emoji (vazio = reação removida). */
  reacao: { alvoId: string; emoji: string } | null;
  situacao: Situacao | null;
  enviadaEm: string;
  nomeContato: string | null;
};

type Objeto = Record<string, unknown>;

const obj = (v: unknown): Objeto | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : null;
const texto = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const numeroOuNulo = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const SITUACOES_BAILEYS: Situacao[] = ["ERRO", "PENDENTE", "ENVIADA", "ENTREGUE", "LIDA", "LIDA"];
const SITUACOES_EVOLUTION: Record<string, Situacao> = {
  ERROR: "ERRO",
  PENDING: "PENDENTE",
  SERVER_ACK: "ENVIADA",
  DELIVERY_ACK: "ENTREGUE",
  READ: "LIDA",
  PLAYED: "LIDA",
};

/** Situação de entrega como o Evolution manda (texto ou número do Baileys). */
export function situacaoDe(valor: unknown): Situacao | null {
  if (typeof valor === "number") return SITUACOES_BAILEYS[valor] ?? null;
  if (typeof valor === "string") return SITUACOES_EVOLUTION[valor] ?? null;
  return null;
}

/** Data em segundos (número, texto ou o `Long` do Baileys) para ISO. */
function dataDe(valor: unknown): string | null {
  const o = obj(valor);
  const segundos =
    typeof valor === "number"
      ? valor
      : typeof valor === "string" && /^\d+$/.test(valor)
        ? Number(valor)
        : o && typeof o["low"] === "number"
          ? (o["low"] as number) >>> 0
          : null;
  return segundos === null || segundos <= 0 ? null : new Date(segundos * 1000).toISOString();
}

/** Os tipos de conteúdo do Baileys que aparecem por fora de outros (efêmera, visualização única). */
function conteudoDe(message: Objeto): Objeto {
  for (const envoltorio of [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "documentWithCaptionMessage",
  ]) {
    const dentro = obj(obj(message[envoltorio])?.["message"]);
    if (dentro) return conteudoDe(dentro);
  }
  return message;
}

function citadaDe(conteudo: Objeto, registro: Objeto): Mensagem["citada"] {
  const contexto =
    obj(registro["contextInfo"]) ??
    Object.values(conteudo)
      .map((v) => obj(obj(v)?.["contextInfo"]))
      .find(Boolean) ??
    null;
  const id = texto(contexto?.["stanzaId"]);
  if (!id) return null;
  const quotedMessage = obj(contexto?.["quotedMessage"]);
  return { id, texto: quotedMessage ? resumoDoConteudo(conteudoDe(quotedMessage)) : null };
}

type Leitura = Pick<Mensagem, "tipo" | "texto" | "midia" | "reacao">;

function lerConteudo(c: Objeto): Leitura {
  const midia = (m: Objeto) => ({
    mimetype: texto(m["mimetype"]),
    nomeArquivo: texto(m["fileName"]) ?? texto(m["title"]),
    segundos: numeroOuNulo(m["seconds"]),
  });
  const vazio = { midia: null, reacao: null };
  if (typeof c["conversation"] === "string")
    return { tipo: "texto", texto: c["conversation"], ...vazio };
  const extendido = obj(c["extendedTextMessage"]);
  if (extendido) return { tipo: "texto", texto: texto(extendido["text"]), ...vazio };
  const tipos: [string, TipoDeMensagem][] = [
    ["imageMessage", "imagem"],
    ["videoMessage", "video"],
    ["ptvMessage", "video"],
    ["audioMessage", "audio"],
    ["documentMessage", "documento"],
    ["stickerMessage", "figurinha"],
  ];
  for (const [chave, tipo] of tipos) {
    const m = obj(c[chave]);
    if (m) return { tipo, texto: texto(m["caption"]), midia: midia(m), reacao: null };
  }
  const local = obj(c["locationMessage"]) ?? obj(c["liveLocationMessage"]);
  if (local) {
    const lat = numeroOuNulo(local["degreesLatitude"]);
    const lng = numeroOuNulo(local["degreesLongitude"]);
    const nome = texto(local["name"]) ?? texto(local["address"]);
    const coordenadas = lat !== null && lng !== null ? `${lat}, ${lng}` : null;
    return {
      tipo: "localizacao",
      texto: [nome, coordenadas].filter(Boolean).join(" · ") || null,
      ...vazio,
    };
  }
  const contato = obj(c["contactMessage"]);
  if (contato) return { tipo: "contato", texto: texto(contato["displayName"]), ...vazio };
  const contatos = obj(c["contactsArrayMessage"]);
  if (contatos) {
    const lista = Array.isArray(contatos["contacts"]) ? contatos["contacts"] : [];
    const nomes = lista.map((x) => texto(obj(x)?.["displayName"])).filter(Boolean);
    return { tipo: "contato", texto: nomes.join(", ") || texto(contatos["displayName"]), ...vazio };
  }
  const reacao = obj(c["reactionMessage"]);
  const alvoId = texto(obj(reacao?.["key"])?.["id"]);
  if (reacao && alvoId) {
    return {
      tipo: "reacao",
      texto: null,
      midia: null,
      reacao: { alvoId, emoji: typeof reacao["text"] === "string" ? reacao["text"] : "" },
    };
  }
  return { tipo: "nao_suportada", texto: null, ...vazio };
}

const ROTULOS: Record<TipoDeMensagem, string> = {
  texto: "Mensagem",
  imagem: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  documento: "📄 Documento",
  figurinha: "Figurinha",
  localizacao: "📍 Localização",
  contato: "👤 Contato",
  reacao: "Reação",
  nao_suportada: "Mensagem não suportada",
};

function resumoDoConteudo(conteudo: Objeto): string {
  const lido = lerConteudo(conteudo);
  if (lido.tipo === "texto") return lido.texto ?? "";
  if (lido.tipo === "reacao") return `Reagiu ${lido.reacao?.emoji ?? ""}`.trim();
  return lido.texto ? `${ROTULOS[lido.tipo]}: ${lido.texto}` : ROTULOS[lido.tipo];
}

/** Uma linha para a lista de conversas e para a citação. */
export function resumoDaMensagem(m: Pick<Mensagem, "tipo" | "texto" | "reacao">): string {
  if (m.tipo === "texto") return m.texto ?? "";
  if (m.tipo === "reacao") return `Reagiu ${m.reacao?.emoji ?? ""}`.trim();
  return m.texto ? `${ROTULOS[m.tipo]}: ${m.texto}` : ROTULOS[m.tipo];
}

/**
 * CHAT-CA-07: registro de mensagem do Evolution (busca, webhook ou envio) traduzido.
 * Devolve `null` se não é de uma conversa individual ou não tem identificador.
 */
export function mensagemDoEvolution(registro: unknown): Mensagem | null {
  const r = obj(registro);
  const chave = obj(r?.["key"]);
  if (!r || !chave) return null;
  const id = texto(chave["id"]);
  const numero =
    numeroDoJid(chave["remoteJid"]) ??
    numeroDoJid(chave["remoteJidAlt"]) ??
    numeroDoJid(chave["senderPn"]);
  if (!id || !numero) return null;
  const conteudo = conteudoDe(obj(r["message"]) ?? {});
  const atualizacoes = Array.isArray(r["MessageUpdate"]) ? r["MessageUpdate"] : [];
  const ultimaSituacao = atualizacoes.map((u) => obj(u)?.["status"]).at(-1);
  return {
    id,
    numero,
    deMim: chave["fromMe"] === true,
    ...lerConteudo(conteudo),
    citada: citadaDe(conteudo, r),
    situacao: situacaoDe(ultimaSituacao ?? r["status"]),
    enviadaEm: dataDe(r["messageTimestamp"]) ?? new Date(0).toISOString(),
    nomeContato: chave["fromMe"] === true ? null : texto(r["pushName"]),
  };
}

// ---------------------------------------------------------------- conversas

export type Conversa = {
  numero: string;
  nome: string | null;
  temFoto: boolean;
  naoLidas: number;
  ultima: { resumo: string; deMim: boolean; enviadaEm: string } | null;
};

/** CHAT-CA-04: conversa da lista do Evolution (findChats); grupos e status ficam de fora. */
export function conversaDoEvolution(chat: unknown): Conversa | null {
  const c = obj(chat);
  const numero = numeroDoJid(c?.["remoteJid"]) ?? numeroDoJid(c?.["id"]);
  if (!c || !numero) return null;
  const ultimaMensagem = mensagemDoEvolution(c["lastMessage"]);
  const atualizada = typeof c["updatedAt"] === "string" ? c["updatedAt"] : null;
  return {
    numero,
    nome: texto(c["pushName"]) ?? texto(c["name"]),
    temFoto: texto(c["profilePicUrl"]) !== null,
    naoLidas: Math.max(0, numeroOuNulo(c["unreadCount"]) ?? numeroOuNulo(c["unreadMessages"]) ?? 0),
    ultima: ultimaMensagem
      ? {
          resumo: resumoDaMensagem(ultimaMensagem),
          deMim: ultimaMensagem.deMim,
          enviadaEm: ultimaMensagem.enviadaEm,
        }
      : atualizada
        ? { resumo: "", deMim: false, enviadaEm: atualizada }
        : null,
  };
}

/** Da conversa mais recente para a mais antiga; sem mensagem vão para o fim. */
export function ordenarConversas(conversas: readonly Conversa[]): Conversa[] {
  return [...conversas].sort((a, b) =>
    (b.ultima?.enviadaEm ?? "").localeCompare(a.ultima?.enviadaEm ?? ""),
  );
}

// ---------------------------------------------------------------- arquivos

/** CHAT-CA-06: até 10 MB por arquivo. */
export const ARQUIVO_MAXIMO_BYTES = 10 * 1024 * 1024;
export const TEXTO_MAXIMO = 4000;
export const LEGENDA_MAXIMA = 1024;

export const TIPOS_DE_ARQUIVO = ["imagem", "video", "documento", "audio", "figurinha"] as const;
export type TipoDeArquivo = (typeof TIPOS_DE_ARQUIVO)[number];

export const FORMATOS_ACEITOS: Record<TipoDeArquivo, readonly string[]> = {
  imagem: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4"],
  audio: ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac"],
  documento: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
  figurinha: ["image/png", "image/jpeg", "image/webp"],
};

/** Tamanho em bytes do conteúdo de um texto em base64. */
export function bytesDoBase64(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** "audio/webm;codecs=opus" → "audio/webm". */
export function formatoBase(mimetype: string): string {
  return mimetype.split(";")[0]!.trim().toLowerCase();
}

/** CHAT-CA-06: problema do arquivo para o tipo pedido, ou `null` se pode enviar. */
export function problemaDoArquivo(
  tipo: TipoDeArquivo,
  mimetype: string,
  base64: string,
): string | null {
  if (!base64 || base64.length % 4 !== 0 || !BASE64.test(base64)) return "Arquivo inválido.";
  if (bytesDoBase64(base64) > ARQUIVO_MAXIMO_BYTES) return "O arquivo passa de 10 MB.";
  if (!FORMATOS_ACEITOS[tipo].includes(formatoBase(mimetype))) {
    return "Tipo de arquivo não aceito.";
  }
  return null;
}

// ---------------------------------------------------------------- eventos

export type EventoChat =
  | { tipo: "mensagem"; mensagem: Mensagem }
  | { tipo: "situacao"; numero: string; mensagemId: string; situacao: Situacao }
  | { tipo: "conexao"; estado: EstadoConexao }
  | { tipo: "qrcode"; base64: string };

export type EstadoConexao = "CONECTADO" | "CONECTANDO" | "DESCONECTADO";

export function estadoDe(valor: unknown): EstadoConexao {
  if (valor === "open") return "CONECTADO";
  if (valor === "connecting") return "CONECTANDO";
  return "DESCONECTADO";
}

/**
 * CHAT-CA-08: evento do webhook do Evolution (repassado pelo microserviço) traduzido
 * para a tela. Eventos de outras instâncias e os que a tela não usa viram `null`.
 */
export function eventoDoWebhook(payload: unknown, instancia: string): EventoChat | null {
  const p = obj(payload);
  if (!p || p["instance"] !== instancia) return null;
  const nome = typeof p["event"] === "string" ? p["event"].toUpperCase().replace(/\./g, "_") : "";
  const dados = p["data"];
  if (nome === "MESSAGES_UPSERT" || nome === "SEND_MESSAGE") {
    const registros = Array.isArray(obj(dados)?.["messages"])
      ? (obj(dados)!["messages"] as unknown[])
      : [dados];
    const mensagem = registros.map(mensagemDoEvolution).find(Boolean);
    return mensagem ? { tipo: "mensagem", mensagem } : null;
  }
  if (nome === "MESSAGES_UPDATE") {
    const d = obj(Array.isArray(dados) ? dados[0] : dados);
    const numero = numeroDoJid(d?.["remoteJid"]) ?? numeroDoJid(obj(d?.["key"])?.["remoteJid"]);
    const mensagemId = texto(d?.["keyId"]) ?? texto(obj(d?.["key"])?.["id"]);
    const situacao = situacaoDe(d?.["status"] ?? obj(d?.["update"])?.["status"]);
    return numero && mensagemId && situacao
      ? { tipo: "situacao", numero, mensagemId, situacao }
      : null;
  }
  if (nome === "CONNECTION_UPDATE")
    return { tipo: "conexao", estado: estadoDe(obj(dados)?.["state"]) };
  if (nome === "QRCODE_UPDATED") {
    const base64 = texto(obj(obj(dados)?.["qrcode"])?.["base64"]);
    return base64 ? { tipo: "qrcode", base64 } : null;
  }
  return null;
}

/**
 * Lê blocos de Server-Sent Events: devolve o `data` de cada bloco completo e o que
 * sobrou para juntar com o próximo pedaço.
 */
export function lerBlocosSse(buffer: string): { dados: string[]; resto: string } {
  const normalizado = buffer.replace(/\r\n/g, "\n");
  const blocos = normalizado.split("\n\n");
  const resto = blocos.pop() ?? "";
  const dados = blocos
    .map((bloco) =>
      bloco
        .split("\n")
        .filter((linha) => linha.startsWith("data:"))
        .map((linha) => linha.slice(5).replace(/^ /, ""))
        .join("\n"),
    )
    .filter((d) => d !== "");
  return { dados, resto };
}

// ---------------------------------------------------------------- contatos (CHAT-CA-14)

/** Contato do WhatsApp (findContacts) com número; grupos e @lid ficam de fora. */
export function contatoDoEvolution(
  contato: unknown,
): { numero: string; nome: string | null } | null {
  const c = obj(contato);
  const numero = numeroDoJid(c?.["remoteJid"]) ?? numeroDoJid(c?.["id"]);
  if (!c || !numero) return null;
  return { numero, nome: texto(c["pushName"]) ?? texto(c["name"]) };
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** A busca da janela de nova conversa: parte do nome (sem acento) ou, com 3+ dígitos, do número. */
export function contatoCombina(
  contato: { numero: string; nome: string | null },
  busca: string,
): boolean {
  const termo = semAcento(busca.trim());
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, "");
  return (
    semAcento(contato.nome ?? "").includes(termo) ||
    (digitos.length >= 3 && contato.numero.includes(digitos))
  );
}
