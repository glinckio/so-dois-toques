import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Ator } from "../aulas/comum.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Envio } from "./esquemas.js";
import { ErroDoEvolution, EvolutionCliente } from "./evolution.cliente.js";
import {
  conversaDoEvolution,
  estadoDe,
  jidDoNumero,
  mensagemDoEvolution,
  numeroCompleto,
  numeroDoJid,
  ordenarConversas,
  problemaDoArquivo,
  telefonesParecidos,
  type Mensagem,
} from "./regras.js";

/** Mensagens por página na conversa (CHAT-CA-05). */
const POR_PAGINA = 30;
/** Quantas das mais recentes são marcadas como lidas ao abrir a conversa. */
const MARCAR_LIDAS = 50;

type Objeto = Record<string, unknown>;
const obj = (v: unknown): Objeto | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Objeto) : null;

/** Hosts de onde a foto de perfil pode ser buscada (CDN do WhatsApp). */
const HOST_DA_FOTO = /(^|\.)whatsapp\.net$/;

const naoEncontrado = (erro: unknown) =>
  erro instanceof ErroDoEvolution && erro.statusDoEvolution === 404;

/** Etapa 20: conexão do número, conversas, mensagens e envios pelo microserviço. */
@Injectable()
export class ChatService {
  constructor(
    private readonly evolution: EvolutionCliente,
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private get inst() {
    return encodeURIComponent(this.evolution.instancia);
  }

  // ---------- Conexão (CHAT-CA-03 e 12) ----------

  private async instancia(): Promise<Objeto | null> {
    const lista = await this.evolution.chamar<unknown>("GET", "/instance/fetchInstances", {
      consulta: { instanceName: this.evolution.instancia },
    });
    const itens = Array.isArray(lista) ? lista : [lista];
    return (
      itens
        .map(obj)
        .find(
          (i) =>
            i && (i["name"] ?? obj(i["instance"])?.["instanceName"]) === this.evolution.instancia,
        ) ?? null
    );
  }

  async conexao() {
    if (!this.evolution.configurado()) {
      return { configurado: false, estado: "DESCONECTADO" as const, numero: null, nome: null };
    }
    let instancia: Objeto | null;
    try {
      instancia = await this.instancia();
    } catch (erro) {
      if (!naoEncontrado(erro)) throw erro;
      instancia = null;
    }
    return {
      configurado: true,
      estado: estadoDe(instancia?.["connectionStatus"]),
      numero: numeroDoJid(instancia?.["ownerJid"]),
      nome: typeof instancia?.["profileName"] === "string" ? instancia["profileName"] : null,
    };
  }

  async conectar(ator: Ator) {
    const atual = await this.conexao();
    if (atual.estado === "CONECTADO") return { ...atual, qrcode: null };
    let instancia: Objeto | null = null;
    try {
      instancia = await this.instancia();
    } catch (erro) {
      if (!naoEncontrado(erro)) throw erro;
    }
    if (!instancia) {
      await this.evolution.chamar("POST", "/instance", {
        corpo: {
          instanceName: this.evolution.instancia,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          groupsIgnore: true,
        },
      });
    }
    const conexao = await this.evolution.chamar<Objeto>("GET", `/instance/connect/${this.inst}`);
    await this.auditoria.registrar({
      acao: "WHATSAPP_CONEXAO_INICIADA",
      atorId: ator.id,
      ip: ator.ip,
      alvoTipo: "WhatsApp",
      alvoId: this.evolution.instancia,
    });
    return {
      configurado: true,
      estado: "CONECTANDO" as const,
      numero: null,
      nome: null,
      qrcode: typeof conexao?.["base64"] === "string" ? conexao["base64"] : null,
    };
  }

  async desconectar(ator: Ator) {
    try {
      await this.evolution.chamar("DELETE", `/instance/logout/${this.inst}`);
    } catch (erro) {
      if (!naoEncontrado(erro)) throw erro;
    }
    await this.auditoria.registrar({
      acao: "WHATSAPP_DESCONECTADO",
      atorId: ator.id,
      ip: ator.ip,
      alvoTipo: "WhatsApp",
      alvoId: this.evolution.instancia,
    });
    return { configurado: true, estado: "DESCONECTADO" as const, numero: null, nome: null };
  }

  // ---------- Conversas (CHAT-CA-04 e 11) ----------

  /** Aluno (não anonimizado) de cada número, pelo telefone com e sem o nono dígito. */
  private async alunosDosNumeros(numeros: readonly string[]) {
    const porTelefone = new Map<string, string>();
    for (const numero of numeros) {
      for (const telefone of telefonesParecidos(numero)) porTelefone.set(telefone, numero);
    }
    if (porTelefone.size === 0) return new Map<string, { id: string; nome: string }>();
    const alunos = await this.prisma.aluno.findMany({
      where: { telefone: { in: [...porTelefone.keys()] }, anonimizadoEm: null },
      select: { id: true, nome: true, telefone: true, ativo: true },
      orderBy: [{ ativo: "desc" }, { criadoEm: "asc" }],
    });
    const resultado = new Map<string, { id: string; nome: string }>();
    for (const aluno of alunos) {
      const numero = porTelefone.get(aluno.telefone)!;
      if (!resultado.has(numero)) resultado.set(numero, { id: aluno.id, nome: aluno.nome });
    }
    return resultado;
  }

  async conversas() {
    const chats = await this.evolution.chamar<unknown>("GET", `/chat/chats/${this.inst}`);
    const conversas = ordenarConversas(
      (Array.isArray(chats) ? chats : []).flatMap((c) => conversaDoEvolution(c) ?? []),
    );
    const alunos = await this.alunosDosNumeros(conversas.map((c) => c.numero));
    return conversas.map((c) => ({ ...c, aluno: alunos.get(c.numero) ?? null }));
  }

  /** CHAT-CA-11: o número digitado tem WhatsApp? */
  async verificarNumero(digitado: string) {
    const numero = numeroCompleto(digitado);
    if (!numero) throw new BadRequestException("Informe o número com DDD.");
    const resposta = await this.evolution.chamar<unknown>("POST", "/chat/whatsapp-numbers", {
      corpo: { instanceName: this.evolution.instancia, numbers: [numero] },
    });
    const item = obj(Array.isArray(resposta) ? resposta[0] : null);
    const existe = item?.["exists"] === true;
    return { numero: (existe && numeroDoJid(item?.["jid"])) || numero, existe };
  }

  // ---------- Mensagens (CHAT-CA-05, 07 e 09) ----------

  private async registros(numero: string, pagina: number, porPagina: number) {
    const resposta = await this.evolution.chamar<unknown>("GET", `/chat/messages/${this.inst}`, {
      consulta: {
        where: JSON.stringify({ remoteJid: jidDoNumero(numero) }),
        page: String(pagina),
        offset: String(porPagina),
      },
    });
    const mensagens = obj(obj(resposta)?.["messages"]);
    const registros = Array.isArray(mensagens?.["records"])
      ? (mensagens["records"] as unknown[])
      : Array.isArray(resposta)
        ? resposta
        : [];
    const paginas = typeof mensagens?.["pages"] === "number" ? mensagens["pages"] : 1;
    return { registros, paginas };
  }

  /** CHAT-CA-09: quem da equipe enviou cada mensagem. */
  private async comAutores(mensagens: Mensagem[]) {
    const enviadas = await this.prisma.mensagemEnviada.findMany({
      where: { id: { in: mensagens.filter((m) => m.deMim).map((m) => m.id) } },
      select: { id: true, usuario: { select: { nome: true } } },
    });
    const autores = new Map(enviadas.map((e) => [e.id, e.usuario.nome]));
    return mensagens.map((m) => ({ ...m, autor: autores.get(m.id) ?? null }));
  }

  async mensagens(numero: string, pagina: number) {
    const { registros, paginas } = await this.registros(numero, pagina, POR_PAGINA);
    // O Evolution devolve da mais nova para a mais antiga; no mesmo segundo, vale essa ordem.
    const mensagens = registros
      .flatMap((r) => mensagemDoEvolution(r) ?? [])
      .filter((m) => m.numero === numero)
      .reverse()
      .sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
    const alunos = await this.alunosDosNumeros([numero]);
    return {
      numero,
      aluno: alunos.get(numero) ?? null,
      pagina,
      temMais: pagina < paginas,
      mensagens: await this.comAutores(mensagens),
    };
  }

  async marcarLidas(numero: string) {
    const { registros } = await this.registros(numero, 1, MARCAR_LIDAS);
    const recebidas = registros
      .flatMap((r) => mensagemDoEvolution(r) ?? [])
      .filter((m) => !m.deMim && m.numero === numero);
    if (recebidas.length > 0) {
      await this.evolution.chamar("POST", "/chat/mark-as-read", {
        corpo: {
          instanceName: this.evolution.instancia,
          readMessages: recebidas.map((m) => ({
            remoteJid: jidDoNumero(numero),
            fromMe: false,
            id: m.id,
          })),
        },
      });
    }
    return { marcadas: recebidas.length };
  }

  // ---------- Envio (CHAT-CA-06 e 09) ----------

  private async midiaBase64(mensagemId: string): Promise<{ base64: string; mimetype: string }> {
    let resposta: Objeto | null;
    try {
      resposta = obj(
        await this.evolution.chamar<unknown>("POST", `/chat/base64-media/${this.inst}`, {
          corpo: { message: { key: { id: mensagemId } }, convertToMp4: false },
        }),
      );
    } catch (erro) {
      if (naoEncontrado(erro) || erro instanceof ErroDoEvolution) {
        throw new NotFoundException("Mídia não encontrada.");
      }
      throw erro;
    }
    const base64 = typeof resposta?.["base64"] === "string" ? resposta["base64"] : "";
    if (!base64) throw new NotFoundException("Mídia não encontrada.");
    const mimetype =
      typeof resposta?.["mimetype"] === "string"
        ? resposta["mimetype"]
        : "application/octet-stream";
    return { base64: base64.replace(/^data:[^,]*,/, ""), mimetype };
  }

  private chamadaDoEnvio(numero: string, envio: Envio, figurinha?: string) {
    const comum = {
      instanceName: this.evolution.instancia,
      number: numero,
      ...(envio.citadaId && { quoted: { key: { id: envio.citadaId } } }),
    };
    switch (envio.tipo) {
      case "texto":
        return { rota: "/message/send-text", corpo: { ...comum, text: envio.texto } };
      case "audio":
        return { rota: "/message/send-audio", corpo: { ...comum, audio: envio.arquivo.base64 } };
      case "figurinha":
        return {
          rota: "/message/send-sticker",
          corpo: { ...comum, sticker: figurinha ?? envio.arquivo!.base64 },
        };
      default: {
        const mediatype =
          envio.tipo === "imagem" ? "image" : envio.tipo === "video" ? "video" : "document";
        return {
          rota: "/message/send-media",
          corpo: {
            ...comum,
            mediatype,
            mimetype: envio.arquivo.mimetype,
            media: envio.arquivo.base64,
            fileName: envio.arquivo.nome,
            ...(envio.legenda && { caption: envio.legenda }),
          },
        };
      }
    }
  }

  async enviar(ator: Ator, numero: string, envio: Envio) {
    if ("arquivo" in envio && envio.arquivo) {
      const problema = problemaDoArquivo(
        envio.tipo as Exclude<Envio["tipo"], "texto">,
        envio.arquivo.mimetype,
        envio.arquivo.base64,
      );
      if (problema) throw new BadRequestException(problema);
    }
    const figurinha =
      envio.tipo === "figurinha" && envio.deMensagemId
        ? (await this.midiaBase64(envio.deMensagemId)).base64
        : undefined;
    const { rota, corpo } = this.chamadaDoEnvio(numero, envio, figurinha);
    const resposta = await this.evolution.chamar<unknown>("POST", rota, {
      corpo,
      tempoMs: 120_000,
    });
    const mensagem = mensagemDoEvolution(resposta);
    const id = mensagem?.id ?? (obj(obj(resposta)?.["key"])?.["id"] as string | undefined);
    if (!id) throw new ErroDoEvolution(502, "Não foi possível enviar.");
    await this.prisma.mensagemEnviada.upsert({
      where: { id },
      create: { id, numero, usuarioId: ator.id },
      update: {},
    });
    const autor = await this.prisma.usuario.findUnique({
      where: { id: ator.id },
      select: { nome: true },
    });
    return {
      mensagem: mensagem ? { ...mensagem, numero, autor: autor?.nome ?? null } : null,
      id,
    };
  }

  async reagir(numero: string, dados: { mensagemId: string; deMim: boolean; emoji: string }) {
    await this.evolution.chamar("POST", "/message/send-reaction", {
      corpo: {
        instanceName: this.evolution.instancia,
        remoteJid: jidDoNumero(numero),
        messageId: dados.mensagemId,
        fromMe: dados.deMim,
        reaction: dados.emoji,
      },
    });
    return { reagida: true };
  }

  // ---------- Mídia e foto (CHAT-CA-10) ----------

  midia(mensagemId: string) {
    return this.midiaBase64(mensagemId);
  }

  async foto(numero: string) {
    try {
      const resposta = obj(
        await this.evolution.chamar<unknown>("GET", `/chat/profile-picture/${this.inst}`, {
          consulta: { number: numero },
        }),
      );
      const url =
        typeof resposta?.["profilePictureUrl"] === "string" ? resposta["profilePictureUrl"] : null;
      if (!url) return { url: null };
      const endereco = new URL(url);
      return {
        url: endereco.protocol === "https:" && HOST_DA_FOTO.test(endereco.hostname) ? url : null,
      };
    } catch {
      return { url: null };
    }
  }
}
