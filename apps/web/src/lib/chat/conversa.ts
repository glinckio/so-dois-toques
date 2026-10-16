/** Etapa 20: o que a API do Chat devolve e as contas da tela de conversa. */

export type TipoDeMensagem =
  | "texto"
  | "imagem"
  | "video"
  | "audio"
  | "documento"
  | "figurinha"
  | "localizacao"
  | "contato"
  | "reacao"
  | "nao_suportada";

export type Situacao = "ERRO" | "PENDENTE" | "ENVIADA" | "ENTREGUE" | "LIDA";

export type Mensagem = {
  id: string;
  numero: string;
  deMim: boolean;
  tipo: TipoDeMensagem;
  texto: string | null;
  midia: { mimetype: string | null; nomeArquivo: string | null; segundos: number | null } | null;
  citada: { id: string; texto: string | null } | null;
  reacao: { alvoId: string; emoji: string } | null;
  situacao: Situacao | null;
  enviadaEm: string;
  nomeContato: string | null;
  autor?: string | null;
};

export type Conversa = {
  numero: string;
  nome: string | null;
  temFoto: boolean;
  naoLidas: number;
  ultima: { resumo: string; deMim: boolean; enviadaEm: string } | null;
  aluno: { id: string; nome: string } | null;
};

export type EstadoConexao = "CONECTADO" | "CONECTANDO" | "DESCONECTADO";

export type Conexao = {
  configurado: boolean;
  estado: EstadoConexao;
  numero: string | null;
  nome: string | null;
  qrcode?: string | null;
};

export type PaginaDeMensagens = {
  numero: string;
  aluno: { id: string; nome: string } | null;
  pagina: number;
  temMais: boolean;
  mensagens: Mensagem[];
};

export type EventoChat =
  | { tipo: "mensagem"; mensagem: Mensagem }
  | { tipo: "situacao"; numero: string; mensagemId: string; situacao: Situacao }
  | { tipo: "conexao"; estado: EstadoConexao }
  | { tipo: "qrcode"; base64: string }
  | { tipo: "ping" };

// ---------------------------------------------------------------- números e nomes

/** "+55 (51) 99999-8888". */
export function formatarNumero(numero: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(numero);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${numero}`;
}

/** CHAT-CA-04: o aluno cadastrado vem antes do nome do WhatsApp; sem nenhum, o número. */
export function nomeDaConversa(c: Pick<Conversa, "nome" | "numero" | "aluno">): string {
  return c.aluno?.nome ?? c.nome ?? formatarNumero(c.numero);
}

/** Telefone do cadastro (DDD + número) para o número do WhatsApp. */
export function numeroDoTelefone(telefone: string): string {
  return `55${telefone.replace(/\D/g, "")}`;
}

/** Busca por nome (sem acento) ou por parte do número. */
export function filtrarConversas(conversas: readonly Conversa[], busca: string): Conversa[] {
  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const termo = normalizar(busca.trim());
  if (!termo) return [...conversas];
  const digitos = termo.replace(/\D/g, "");
  return conversas.filter(
    (c) =>
      normalizar(nomeDaConversa(c)).includes(termo) ||
      normalizar(c.nome ?? "").includes(termo) ||
      (digitos.length >= 3 && c.numero.includes(digitos)),
  );
}

// ---------------------------------------------------------------- mensagens

/** Junta mensagens novas às que já estão na tela, sem repetir, da mais antiga para a mais nova. */
export function juntarMensagens(
  atuais: readonly Mensagem[],
  novas: readonly Mensagem[],
): Mensagem[] {
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const nova of novas) {
    const antiga = porId.get(nova.id);
    // O evento do webhook não sabe o autor; mantém o que a API devolveu no envio.
    porId.set(nova.id, antiga ? { ...antiga, ...nova, autor: nova.autor ?? antiga.autor } : nova);
  }
  return [...porId.values()].sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
}

/** Reações ficam embaixo da mensagem reagida, não como mensagem solta (uma por pessoa). */
export function separarReacoes(mensagens: readonly Mensagem[]) {
  const reacoes = new Map<string, Map<string, string>>();
  const linha: Mensagem[] = [];
  for (const m of mensagens) {
    if (m.tipo !== "reacao" || !m.reacao) {
      linha.push(m);
      continue;
    }
    const daMensagem = reacoes.get(m.reacao.alvoId) ?? new Map<string, string>();
    const quem = m.deMim ? "eu" : m.numero;
    if (m.reacao.emoji) daMensagem.set(quem, m.reacao.emoji);
    else daMensagem.delete(quem);
    reacoes.set(m.reacao.alvoId, daMensagem);
  }
  const emojis = new Map([...reacoes].map(([id, porQuem]) => [id, [...porQuem.values()]]));
  return { linha, reacoes: emojis };
}

const DIA_EM_SP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const DIA_LONGO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "numeric",
  month: "long",
});
const HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

export function horaDaMensagem(iso: string): string {
  return HORA.format(new Date(iso));
}

/** Separadores de dia na conversa: "Hoje", "Ontem" ou a data (fuso de São Paulo). */
export function rotuloDoDia(iso: string, agora: Date): string {
  const dia = DIA_EM_SP.format(new Date(iso));
  if (dia === DIA_EM_SP.format(agora)) return "Hoje";
  if (dia === DIA_EM_SP.format(new Date(agora.getTime() - 86_400_000))) return "Ontem";
  const texto = DIA_LONGO.format(new Date(iso));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Na lista de conversas: hora se for hoje, "Ontem" ou a data curta. */
export function quandoNaLista(iso: string, agora: Date): string {
  const rotulo = rotuloDoDia(iso, agora);
  if (rotulo === "Hoje") return horaDaMensagem(iso);
  if (rotulo === "Ontem") return rotulo;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

const RESUMOS: Record<TipoDeMensagem, string> = {
  texto: "",
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

export function resumoDaMensagem(m: Pick<Mensagem, "tipo" | "texto" | "reacao">): string {
  if (m.tipo === "texto") return m.texto ?? "";
  if (m.tipo === "reacao") return `Reagiu ${m.reacao?.emoji ?? ""}`.trim();
  return m.texto ? `${RESUMOS[m.tipo]}: ${m.texto}` : RESUMOS[m.tipo];
}

/**
 * CHAT-CA-08: mensagem que chegou pelos eventos atualiza a lista de conversas: sobe para
 * o topo com o resumo e, se não é a conversa aberta, conta como não lida.
 */
export function conversasComMensagem(
  conversas: readonly Conversa[],
  m: Mensagem,
  aberta: string | null,
): Conversa[] {
  if (m.tipo === "reacao") return [...conversas];
  const atual = conversas.find((c) => c.numero === m.numero);
  const naoLidas = (atual?.naoLidas ?? 0) + (!m.deMim && aberta !== m.numero ? 1 : 0);
  const atualizada: Conversa = {
    numero: m.numero,
    nome: atual?.nome ?? m.nomeContato,
    temFoto: atual?.temFoto ?? false,
    aluno: atual?.aluno ?? null,
    naoLidas: aberta === m.numero ? 0 : naoLidas,
    ultima: { resumo: resumoDaMensagem(m), deMim: m.deMim, enviadaEm: m.enviadaEm },
  };
  return [atualizada, ...conversas.filter((c) => c.numero !== m.numero)];
}

/** Situação nova de uma mensagem enviada (entregue, lida). Só avança, nunca volta. */
export function comSituacao(
  mensagens: readonly Mensagem[],
  id: string,
  situacao: Situacao,
): Mensagem[] {
  const ordem: Situacao[] = ["ERRO", "PENDENTE", "ENVIADA", "ENTREGUE", "LIDA"];
  return mensagens.map((m) =>
    m.id === id && ordem.indexOf(situacao) > ordem.indexOf(m.situacao ?? "PENDENTE")
      ? { ...m, situacao }
      : m,
  );
}

// ---------------------------------------------------------------- arquivos

/** CHAT-CA-06: os mesmos limites da API, para avisar antes de enviar. */
export const ARQUIVO_MAXIMO_BYTES = 10 * 1024 * 1024;
export const TEXTO_MAXIMO = 4000;

export const FORMATOS_ACEITOS = {
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
} as const;
export type TipoDeArquivo = keyof typeof FORMATOS_ACEITOS;

/** O `accept` do campo de arquivo do anexo (imagem, vídeo e documento). */
export const ACEITA_NO_ANEXO = [
  ...FORMATOS_ACEITOS.imagem,
  ...FORMATOS_ACEITOS.video,
  ...FORMATOS_ACEITOS.documento,
  ...FORMATOS_ACEITOS.audio,
].join(",");

const base = (mimetype: string) => mimetype.split(";")[0]!.trim().toLowerCase();

/** O tipo de envio pelo formato do arquivo escolhido no anexo. */
export function tipoDoAnexo(mimetype: string): Exclude<TipoDeArquivo, "figurinha"> | null {
  const formato = base(mimetype);
  for (const tipo of ["imagem", "video", "audio", "documento"] as const) {
    if ((FORMATOS_ACEITOS[tipo] as readonly string[]).includes(formato)) return tipo;
  }
  return null;
}

/** CHAT-CA-06: problema do arquivo antes de enviar, ou `null`. */
export function problemaDoArquivo(
  tipo: TipoDeArquivo,
  mimetype: string,
  bytes: number,
): string | null {
  if (bytes <= 0) return "Arquivo vazio.";
  if (bytes > ARQUIVO_MAXIMO_BYTES) return "O arquivo passa de 10 MB.";
  if (!(FORMATOS_ACEITOS[tipo] as readonly string[]).includes(base(mimetype))) {
    return "Tipo de arquivo não aceito.";
  }
  return null;
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** "0:07", "1:32". */
export function duracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
