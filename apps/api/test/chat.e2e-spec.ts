import type { INestApplication } from "@nestjs/common";
import { firstValueFrom, filter, timeout } from "rxjs";
import { EventosDoChat } from "../src/chat/eventos.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { cliente, criarApp } from "./apoio.js";
import { criarAluno, logado } from "./apoio-aulas.js";
import { iniciarEvolutionFalso, PNG_1X1, type EvolutionFalso } from "./evolution-falso.js";

const CHAVE = "chave-do-evolution-falso-dos-testes-0000";

let sequencia = 0;
/** Número de celular novo a cada teste: 55 + DDD 51 + 9 + oito dígitos. */
function numeroNovo() {
  sequencia += 1;
  return `55519${String(70000000 + sequencia * 7919).slice(-8)}`;
}

type Mensagem = {
  id: string;
  tipo: string;
  texto: string | null;
  deMim: boolean;
  autor: string | null;
  citada: { id: string; texto: string | null } | null;
  reacao: { alvoId: string; emoji: string } | null;
  enviadaEm: string;
};

describe("Etapa 20: chat do WhatsApp", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let evolution: EvolutionFalso;
  let admin: Awaited<ReturnType<typeof logado>>;
  let atendente: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    evolution = await iniciarEvolutionFalso({ chave: CHAVE });
    app = await criarApp({ EVOLUTION_URL: evolution.url, EVOLUTION_CHAVE: CHAVE });
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
    atendente = await logado(app, "ATENDENTE");
  });

  afterAll(async () => {
    await app.close();
    await evolution.fechar();
  });

  async function mensagens(numero: string, pagina = 1) {
    const r = await admin.api.get(
      `/chat/conversas/${numero}/mensagens?pagina=${pagina}`,
      admin.token,
    );
    expect(r.status, r.text).toBe(200);
    return r.body as {
      mensagens: Mensagem[];
      temMais: boolean;
      aluno: { id: string; nome: string } | null;
    };
  }

  const enviar = (numero: string, corpo: object, quem = admin) =>
    quem.api.post(`/chat/conversas/${numero}/mensagens`, corpo, quem.token);

  it("CHAT-CA-03: o administrador vê o estado, gera o QR code e desconecta; fica na auditoria; o atendente não", async () => {
    evolution.reiniciar();
    expect((await admin.api.get("/chat/conexao", admin.token).expect(200)).body).toEqual({
      configurado: true,
      estado: "DESCONECTADO",
      numero: null,
      nome: null,
    });

    const conectar = await admin.api.post("/chat/conexao", {}, admin.token).expect(200);
    expect(conectar.body).toMatchObject({ estado: "CONECTANDO" });
    expect(conectar.body.qrcode).toMatch(/^data:image\/png;base64,/);
    expect(evolution.estado.existe).toBe(true);
    expect(evolution.chamadas.find((c) => c.caminho.endsWith("/instance"))?.corpo).toMatchObject({
      instanceName: "so-dois-toques",
      integration: "WHATSAPP-BAILEYS",
      groupsIgnore: true,
    });

    // O celular leu o QR code.
    await fetch(`${evolution.url}/__teste/conectar`, { method: "POST" });
    expect(
      (await atendente.api.get("/chat/conexao", atendente.token).expect(200)).body,
    ).toMatchObject({
      estado: "CONECTADO",
      numero: "5551988887777",
    });
    // Já conectado, conectar de novo não gera QR code.
    expect((await admin.api.post("/chat/conexao", {}, admin.token).expect(200)).body).toMatchObject(
      {
        estado: "CONECTADO",
        qrcode: null,
      },
    );

    await atendente.api.post("/chat/conexao", {}, atendente.token).expect(403);
    await atendente.api.delete("/chat/conexao", atendente.token).expect(403);
    expect(evolution.estado.conexao).toBe("open");

    await admin.api.delete("/chat/conexao", admin.token).expect(200);
    expect(evolution.estado.conexao).toBe("close");

    const auditoria = await prisma.auditoria.findMany({
      where: {
        atorId: admin.usuario.id,
        acao: { in: ["WHATSAPP_CONEXAO_INICIADA", "WHATSAPP_DESCONECTADO"] },
      },
      orderBy: { id: "asc" },
    });
    expect(auditoria.map((a) => a.acao)).toEqual([
      "WHATSAPP_CONEXAO_INICIADA",
      "WHATSAPP_DESCONECTADO",
    ]);
    expect(auditoria.every((a) => a.ip === admin.api.ip)).toBe(true);
  });

  it("CHAT-CA-04: só conversas individuais, da mais recente para a mais antiga, com o aluno pelo telefone", async () => {
    evolution.reiniciar();
    const antiga = numeroNovo();
    evolution.receber(antiga, { conversation: "Primeira" }, { nome: "Contato" });
    // Aluno cadastrado com o nono dígito; o WhatsApp dele é uma conta antiga, sem o nove.
    const alunoId = await criarAluno(admin.api, admin.token, { telefone: "(51) 99876-5432" });
    await new Promise((r) => setTimeout(r, 1100));
    evolution.receber("555198765432", {
      imageMessage: { caption: "Treino", mimetype: "image/jpeg" },
    });

    const lista = (await atendente.api.get("/chat/conversas", atendente.token).expect(200))
      .body as {
      numero: string;
      nome: string | null;
      naoLidas: number;
      aluno: { id: string } | null;
      ultima: { resumo: string } | null;
    }[];
    expect(lista.map((c) => c.numero)).toEqual(["555198765432", antiga]);
    expect(lista[0]).toMatchObject({
      naoLidas: 1,
      aluno: { id: alunoId },
      ultima: { resumo: "📷 Foto: Treino" },
    });
    expect(lista[1]).toMatchObject({
      nome: "Contato",
      aluno: null,
      ultima: { resumo: "Primeira" },
    });
  });

  it("CHAT-CA-05: carrega as mais recentes e, sob pedido, as mais antigas; abrir marca como lidas", async () => {
    const numero = numeroNovo();
    for (let i = 1; i <= 35; i++) evolution.receber(numero, { conversation: `Mensagem ${i}` });

    const primeira = await mensagens(numero);
    expect(primeira.mensagens).toHaveLength(30);
    expect(primeira.temMais).toBe(true);
    expect(primeira.mensagens.at(-1)!.texto).toBe("Mensagem 35");
    const antigas = await mensagens(numero, 2);
    expect(antigas.mensagens.map((m) => m.texto)).toEqual(
      [1, 2, 3, 4, 5].map((i) => `Mensagem ${i}`),
    );
    expect(antigas.temMais).toBe(false);

    await atendente.api.post(`/chat/conversas/${numero}/lidas`, {}, atendente.token).expect(200);
    const lidas = evolution.chamadas
      .filter((c) => c.caminho.endsWith("/chat/mark-as-read"))
      .at(-1)!;
    expect((lidas.corpo as { readMessages: { fromMe: boolean }[] }).readMessages).toHaveLength(35);
    const lista = (await admin.api.get("/chat/conversas", admin.token).expect(200)).body as {
      numero: string;
      naoLidas: number;
    }[];
    expect(lista.find((c) => c.numero === numero)!.naoLidas).toBe(0);

    await admin.api.get("/chat/conversas/123/mensagens", admin.token).expect(400);
  });

  it("CHAT-CA-06: envia texto, mídias, áudio, figurinha, reação e citação; recusa o que não pode", async () => {
    const numero = numeroNovo();
    const recebida = evolution.receber(numero, { conversation: "Tem aula hoje?" });
    const figurinha = evolution.receber(numero, { stickerMessage: { mimetype: "image/webp" } });

    const texto = await enviar(numero, {
      tipo: "texto",
      texto: "Tem sim! ⚽🔥",
      citadaId: recebida.key.id,
    }).expect(201);
    expect(texto.body.mensagem).toMatchObject({
      tipo: "texto",
      texto: "Tem sim! ⚽🔥",
      deMim: true,
      citada: { id: recebida.key.id, texto: "Tem aula hoje?" },
    });
    const ultimaChamada = () => evolution.chamadas.at(-1)!;
    expect(ultimaChamada().corpo).toMatchObject({
      number: numero,
      quoted: { key: { id: recebida.key.id } },
    });

    const arquivo = (mimetype: string, nome: string) => ({ base64: PNG_1X1, mimetype, nome });
    const envios = [
      { tipo: "imagem", arquivo: arquivo("image/png", "foto.png"), legenda: "Treino de hoje" },
      { tipo: "video", arquivo: arquivo("video/mp4", "jogada.mp4") },
      { tipo: "documento", arquivo: arquivo("application/pdf", "regras.pdf") },
      { tipo: "audio", arquivo: arquivo("audio/webm;codecs=opus", "audio.webm") },
      { tipo: "figurinha", arquivo: arquivo("image/png", "figurinha.png") },
      { tipo: "figurinha", deMensagemId: figurinha.key.id },
    ];
    const rotas = [];
    for (const envio of envios) {
      const r = await enviar(numero, envio, atendente);
      expect(r.status, `${envio.tipo}: ${r.text}`).toBe(201);
      rotas.push(ultimaChamada().caminho.split("/").at(-1));
    }
    expect(rotas).toEqual([
      "send-media",
      "send-media",
      "send-media",
      "send-audio",
      "send-sticker",
      "send-sticker",
    ]);
    expect(
      evolution.chamadas.filter((c) => c.caminho.endsWith("send-media"))[0]!.corpo,
    ).toMatchObject({
      mediatype: "image",
      mimetype: "image/png",
      caption: "Treino de hoje",
      fileName: "foto.png",
    });

    await atendente.api
      .post(
        `/chat/conversas/${numero}/reacoes`,
        { mensagemId: recebida.key.id, deMim: false, emoji: "👍" },
        atendente.token,
      )
      .expect(201);
    expect(ultimaChamada().corpo).toMatchObject({
      messageId: recebida.key.id,
      reaction: "👍",
      fromMe: false,
    });

    // Recusas no servidor.
    expect((await enviar(numero, { tipo: "texto", texto: "   " })).status).toBe(400);
    expect((await enviar(numero, { tipo: "texto", texto: "a".repeat(4001) })).status).toBe(400);
    const gif = await enviar(numero, { tipo: "imagem", arquivo: arquivo("image/gif", "a.gif") });
    expect([gif.status, gif.body.message]).toEqual([400, "Tipo de arquivo não aceito."]);
    const exe = await enviar(numero, {
      tipo: "documento",
      arquivo: arquivo("application/x-msdownload", "a.exe"),
    });
    expect(exe.status).toBe(400);
    const grande = Buffer.alloc(10 * 1024 * 1024 + 1, 1).toString("base64");
    const pesado = await enviar(numero, {
      tipo: "video",
      arquivo: { base64: grande, mimetype: "video/mp4", nome: "a.mp4" },
    });
    expect([pesado.status, pesado.body.message]).toEqual([400, "O arquivo passa de 10 MB."]);
    expect((await enviar(numero, { tipo: "figurinha" })).status).toBe(400);
    expect((await enviar(numero, { tipo: "localizacao" })).status).toBe(400);

    // Corpo grande só no envio do chat: o resto da API continua com o limite padrão.
    const outro = await cliente(app).post("/feedback/respostas", {
      nota: 5,
      comentario: "a".repeat(200_000),
    });
    expect(outro.status).toBe(413);
  });

  it("CHAT-CA-07: mensagens recebidas aparecem com o tipo certo", async () => {
    const numero = numeroNovo();
    const conteudos = [
      { conversation: "Oi 😀" },
      { imageMessage: { mimetype: "image/jpeg", caption: "Foto" } },
      { videoMessage: { mimetype: "video/mp4" } },
      { audioMessage: { mimetype: "audio/ogg; codecs=opus", seconds: 4 } },
      { documentMessage: { mimetype: "application/pdf", fileName: "ficha.pdf" } },
      { stickerMessage: { mimetype: "image/webp" } },
      { locationMessage: { degreesLatitude: -29.7, degreesLongitude: -51.1 } },
      { contactMessage: { displayName: "Bia" } },
      { reactionMessage: { key: { id: "QUALQUER" }, text: "❤️" } },
      { pollCreationMessage: { name: "Enquete" } },
    ];
    for (const c of conteudos) evolution.receber(numero, c);
    const { mensagens: lista } = await mensagens(numero);
    expect(lista.map((m) => m.tipo)).toEqual([
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
    ]);
    expect(lista.every((m) => !m.deMim && m.autor === null)).toBe(true);
  });

  it("CHAT-CA-08: mensagem recebida chega pelos eventos em até 5 segundos; o QR code só para o administrador", async () => {
    const numero = numeroNovo();
    const eventos = app.get(EventosDoChat);
    const chegou = firstValueFrom(
      eventos.eventos$.pipe(
        filter((e) => e.tipo === "mensagem" && e.mensagem.numero === numero),
        timeout(5000),
      ),
    );
    await new Promise((r) => setTimeout(r, 300));
    evolution.receber(numero, { conversation: "Chegou?" });
    expect(await chegou).toMatchObject({ tipo: "mensagem", mensagem: { texto: "Chegou?" } });

    // Pela rota SSE, como o web recebe.
    await app.listen(0);
    const base = await app.getUrl();
    async function ouvir(quem: typeof admin) {
      const controle = new AbortController();
      const resposta = await fetch(`${base.replace("[::1]", "127.0.0.1")}/chat/eventos`, {
        headers: {
          "X-Chave-Interna": process.env["INTERNAL_API_KEY"]!,
          Authorization: `Bearer ${quem.token}`,
        },
        signal: controle.signal,
      });
      expect(resposta.headers.get("content-type")).toContain("text/event-stream");
      let texto = "";
      const leitura = (async () => {
        const decodificador = new TextDecoder();
        try {
          for await (const pedaco of resposta.body!) texto += decodificador.decode(pedaco);
        } catch {
          // fim da leitura
        }
      })();
      return {
        texto: () => texto,
        parar: async () => {
          controle.abort();
          await leitura;
        },
      };
    }
    const doAdmin = await ouvir(admin);
    const doAtendente = await ouvir(atendente);
    await new Promise((r) => setTimeout(r, 500));
    evolution.emitir({
      event: "qrcode.updated",
      instance: "so-dois-toques",
      data: { qrcode: { base64: "data:image/png;base64,QRSECRETO" } },
    });
    evolution.receber(numero, { conversation: "Pelo SSE" });
    const limite = Date.now() + 5000;
    while (
      Date.now() < limite &&
      !(doAdmin.texto().includes("Pelo SSE") && doAtendente.texto().includes("Pelo SSE"))
    ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await doAdmin.parar();
    await doAtendente.parar();
    expect(doAtendente.texto()).toContain("Pelo SSE");
    expect(doAtendente.texto()).not.toContain("QRSECRETO");
    expect(doAdmin.texto()).toContain("Pelo SSE");
    expect(doAdmin.texto()).toContain("QRSECRETO");

    // Sem sessão, nada de eventos.
    await cliente(app).get("/chat/eventos").expect(401);
  });

  it("CHAT-CA-09: cada mensagem enviada pelo sistema guarda e mostra quem da equipe enviou", async () => {
    const numero = numeroNovo();
    evolution.receber(numero, { conversation: "Oi" });
    const doAdmin = await enviar(numero, {
      tipo: "texto",
      texto: "Olá, aqui é a coordenação",
    }).expect(201);
    const doAtendente = await enviar(
      numero,
      { tipo: "texto", texto: "E aqui a recepção" },
      atendente,
    ).expect(201);
    expect(doAdmin.body.mensagem.autor).toBe(admin.usuario.nome);

    const { mensagens: lista } = await mensagens(numero);
    expect(lista.map((m) => [m.texto, m.autor])).toEqual([
      ["Oi", null],
      ["Olá, aqui é a coordenação", admin.usuario.nome],
      ["E aqui a recepção", atendente.usuario.nome],
    ]);
    const guardadas = await prisma.mensagemEnviada.findMany({
      where: { numero },
      orderBy: { enviadaEm: "asc" },
    });
    expect(guardadas.map((g) => [g.id, g.usuarioId])).toEqual([
      [doAdmin.body.id, admin.usuario.id],
      [doAtendente.body.id, atendente.usuario.id],
    ]);
  });

  it("CHAT-CA-10: a mídia recebida só sai com sessão e acesso ao Chat", async () => {
    const numero = numeroNovo();
    const foto = evolution.receber(numero, { imageMessage: { mimetype: "image/png" } });
    const rota = `/chat/midias/${foto.key.id}?numero=${numero}`;
    const r = await atendente.api.get(rota, atendente.token).expect(200);
    expect(r.body).toEqual({ base64: PNG_1X1, mimetype: "image/png" });
    await cliente(app).get(rota).expect(401);
    await atendente.api
      .get(`/chat/midias/NAOEXISTE1?numero=${numero}`, atendente.token)
      .expect(404);
    await atendente.api.get(`/chat/midias/${foto.key.id}`, atendente.token).expect(400);
    await atendente.api
      .get(`/chat/midias/a%2F..%2Fb?numero=${numero}`, atendente.token)
      .expect(400);
  });

  it("CHAT-CA-11: nova conversa por número com DDD; número sem WhatsApp é avisado", async () => {
    expect(
      (await atendente.api.get("/chat/numeros/(51)%2098888-7777", atendente.token).expect(200))
        .body,
    ).toEqual({
      numero: "5551988887777",
      existe: true,
    });
    expect(
      (await atendente.api.get("/chat/numeros/51999990000", atendente.token).expect(200)).body,
    ).toEqual({
      numero: "5551999990000",
      existe: false,
    });
    await atendente.api.get("/chat/numeros/123", atendente.token).expect(400);
  });

  it("CHAT-CA-12: sem o WhatsApp configurado, a API sobe e o Chat avisa", async () => {
    const semWhatsapp = await criarApp({ EVOLUTION_URL: undefined, EVOLUTION_CHAVE: undefined });
    try {
      const outro = await logado(semWhatsapp, "ADMINISTRADOR");
      await outro.api.get("/health").expect(200);
      expect((await outro.api.get("/chat/conexao", outro.token).expect(200)).body).toEqual({
        configurado: false,
        estado: "DESCONECTADO",
        numero: null,
        nome: null,
      });
      const conversas = await outro.api.get("/chat/conversas", outro.token);
      expect([conversas.status, conversas.body.message]).toEqual([
        503,
        "WhatsApp não configurado.",
      ]);
    } finally {
      await semWhatsapp.close();
    }
  });

  it("CHAT-CA-14: nova conversa lista alunos, salvos e contatos do WhatsApp; contato novo é salvo e dá nome à conversa", async () => {
    const marca = `Contatinho ${Date.now().toString(36)}`;
    const alunoId = await criarAluno(admin.api, admin.token, {
      nome: `${marca} Aluna`,
      telefone: "(51) 98111-2233",
    });

    // Busca por nome acha o aluno; contato do WhatsApp aparece; grupo e @lid não.
    type Lista = {
      alunos: { id: string; nome: string; numero: string }[];
      salvos: { numero: string; nome: string }[];
      whatsapp: { numero: string; nome: string | null }[];
    };
    const busca = (termo: string) =>
      atendente.api
        .get(`/chat/contatos?busca=${encodeURIComponent(termo)}`, atendente.token)
        .expect(200)
        .then((r) => r.body as Lista);
    const porNome = await busca(marca.toLowerCase());
    expect(porNome.alunos).toEqual([
      { id: alunoId, nome: `${marca} Aluna`, numero: "5551981112233" },
    ]);
    expect((await busca("2233")).alunos.map((a) => a.id)).toContain(alunoId);
    const agenda = await busca("zeca");
    expect(agenda.whatsapp).toEqual([{ numero: "5551933334444", nome: "Zeca da Agenda" }]);
    const tudo = await busca("");
    expect(tudo.whatsapp.some((c) => c.nome === "Grupo" || c.nome === "Sem número")).toBe(false);

    // Contato novo: salvo com nome; número sem WhatsApp é recusado e não é salvo.
    const numeroNovo = `55519${String(Date.now()).slice(-8)}`;
    const salvo = await atendente.api
      .post(
        "/chat/contatos",
        { nome: "Interessada Vôlei", numero: numeroNovo.slice(2) },
        atendente.token,
      )
      .expect(201);
    expect(salvo.body).toEqual({ numero: numeroNovo, nome: "Interessada Vôlei" });
    expect((await busca("volei")).salvos).toContainEqual({
      numero: numeroNovo,
      nome: "Interessada Vôlei",
    });

    const semWhatsapp = await atendente.api.post(
      "/chat/contatos",
      { nome: "Sem Zap", numero: "(51) 99999-0000" },
      atendente.token,
    );
    expect([semWhatsapp.status, semWhatsapp.body.message]).toEqual([
      400,
      "Este número não tem WhatsApp.",
    ]);
    expect(await prisma.contatoChat.findUnique({ where: { numero: "5551999990000" } })).toBeNull();
    await atendente.api
      .post("/chat/contatos", { nome: "", numero: "51999998888" }, atendente.token)
      .expect(400);

    // O nome salvo aparece na conversa e no cabeçalho dela; o do aluno continua valendo para aluno.
    evolution.receber(numeroNovo, { conversation: "Oi!" }, { nome: "Perfil do Zap" });
    const conversas = (await admin.api.get("/chat/conversas", admin.token).expect(200)).body as {
      numero: string;
      nome: string | null;
    }[];
    expect(conversas.find((c) => c.numero === numeroNovo)?.nome).toBe("Interessada Vôlei");
    const pagina = await admin.api
      .get(`/chat/conversas/${numeroNovo}/mensagens`, admin.token)
      .expect(200);
    expect(pagina.body.contato).toBe("Interessada Vôlei");
  });

  it("o microserviço fora do ar vira erro claro, sem derrubar a API", async () => {
    const foraDoAr = await criarApp({
      EVOLUTION_URL: "http://127.0.0.1:9",
      EVOLUTION_CHAVE: CHAVE,
    });
    try {
      const outro = await logado(foraDoAr, "ATENDENTE");
      const r = await outro.api.get("/chat/conversas", outro.token);
      expect([r.status, r.body.message]).toEqual([
        502,
        "Não foi possível falar com o WhatsApp. Tente de novo em instantes.",
      ]);
    } finally {
      await foraDoAr.close();
    }
  });
});
