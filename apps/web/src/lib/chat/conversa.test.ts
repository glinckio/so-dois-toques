import { describe, expect, it } from "vitest";
import {
  ARQUIVO_MAXIMO_BYTES as MAXIMO_DA_API,
  FORMATOS_ACEITOS as FORMATOS_DA_API,
  TEXTO_MAXIMO as TEXTO_DA_API,
} from "../../../../api/src/chat/regras";
import {
  ARQUIVO_MAXIMO_BYTES,
  comSituacao,
  conversasComMensagem,
  duracao,
  filtrarConversas,
  FORMATOS_ACEITOS,
  formatarNumero,
  juntarMensagens,
  nomeDaConversa,
  numeroDoTelefone,
  problemaDoArquivo,
  quandoNaLista,
  resumoDaMensagem,
  rotuloDoDia,
  separarReacoes,
  tamanhoLegivel,
  TEXTO_MAXIMO,
  tipoDoAnexo,
  type Conversa,
  type Mensagem,
} from "./conversa";

const msg = (id: string, extra: Partial<Mensagem> = {}): Mensagem => ({
  id,
  numero: "5551999998888",
  deMim: false,
  tipo: "texto",
  texto: id,
  midia: null,
  citada: null,
  reacao: null,
  situacao: null,
  enviadaEm: "2026-10-16T12:00:00.000Z",
  nomeContato: null,
  ...extra,
});

const conversa = (numero: string, extra: Partial<Conversa> = {}): Conversa => ({
  numero,
  nome: null,
  temFoto: false,
  naoLidas: 0,
  ultima: null,
  aluno: null,
  ...extra,
});

describe("CHAT-CA-04: nomes e busca na lista", () => {
  it("o aluno vem antes do nome do WhatsApp; sem nenhum, o número formatado", () => {
    expect(
      nomeDaConversa(
        conversa("5551999998888", { nome: "Aninha", aluno: { id: "1", nome: "Ana Souza" } }),
      ),
    ).toBe("Ana Souza");
    expect(nomeDaConversa(conversa("5551999998888", { nome: "Aninha" }))).toBe("Aninha");
    expect(nomeDaConversa(conversa("5551999998888"))).toBe("+55 (51) 99999-8888");
    expect(formatarNumero("14155550123")).toBe("+14155550123");
    expect(numeroDoTelefone("(51) 99999-8888")).toBe("5551999998888");
  });

  it("busca por nome sem acento ou por parte do número", () => {
    const lista = [
      conversa("5551999998888", { aluno: { id: "1", nome: "João Pedro" } }),
      conversa("5551977776666", { nome: "Bia" }),
    ];
    expect(filtrarConversas(lista, "joao").map((c) => c.numero)).toEqual(["5551999998888"]);
    expect(filtrarConversas(lista, "7777").map((c) => c.numero)).toEqual(["5551977776666"]);
    expect(filtrarConversas(lista, "  ")).toHaveLength(2);
  });
});

describe("CHAT-CA-05 e 08: mensagens na tela", () => {
  it("junta sem repetir, em ordem, e mantém o autor que o evento não sabe", () => {
    const atuais = [msg("A", { enviadaEm: "2026-10-16T12:00:00Z", autor: "Ana" })];
    const novas = [
      msg("A", { enviadaEm: "2026-10-16T12:00:00Z", situacao: "LIDA" }),
      msg("B", { enviadaEm: "2026-10-16T11:00:00Z" }),
    ];
    const juntas = juntarMensagens(atuais, novas);
    expect(juntas.map((m) => m.id)).toEqual(["B", "A"]);
    expect(juntas[1]).toMatchObject({ autor: "Ana", situacao: "LIDA" });
  });

  it("reações ficam na mensagem reagida, uma por pessoa, e vazia tira a reação", () => {
    const { linha, reacoes } = separarReacoes([
      msg("A"),
      msg("R1", { tipo: "reacao", reacao: { alvoId: "A", emoji: "👍" } }),
      msg("R2", { tipo: "reacao", deMim: true, reacao: { alvoId: "A", emoji: "❤️" } }),
      msg("R3", { tipo: "reacao", reacao: { alvoId: "A", emoji: "😂" } }),
      msg("R4", { tipo: "reacao", deMim: true, reacao: { alvoId: "A", emoji: "" } }),
    ]);
    expect(linha.map((m) => m.id)).toEqual(["A"]);
    expect(reacoes.get("A")).toEqual(["😂"]);
  });

  it("separa por dia no fuso de São Paulo e mostra a hora na lista", () => {
    const agora = new Date("2026-10-16T15:00:00Z");
    expect(rotuloDoDia("2026-10-16T13:00:00Z", agora)).toBe("Hoje");
    expect(rotuloDoDia("2026-10-16T02:00:00Z", agora)).toBe("Ontem");
    expect(rotuloDoDia("2026-10-11T15:00:00Z", agora)).toBe("Domingo, 11 de outubro");
    expect(quandoNaLista("2026-10-16T13:05:00Z", agora)).toBe("10:05");
    expect(quandoNaLista("2026-10-15T13:05:00Z", agora)).toBe("Ontem");
    expect(quandoNaLista("2026-10-01T13:05:00Z", agora)).toBe("01/10");
  });

  it("mensagem nova sobe a conversa e conta como não lida só fora da conversa aberta", () => {
    const lista = [conversa("1"), conversa("5551999998888", { naoLidas: 1, nome: "Ana" })];
    const nova = msg("N", { texto: "Oi", nomeContato: "Ana" });
    const fora = conversasComMensagem(lista, nova, null);
    expect(fora.map((c) => c.numero)).toEqual(["5551999998888", "1"]);
    expect(fora[0]).toMatchObject({ naoLidas: 2, ultima: { resumo: "Oi" } });
    expect(conversasComMensagem(lista, nova, "5551999998888")[0]!.naoLidas).toBe(0);
    const nova2 = msg("N2", { numero: "5551000000001", nomeContato: "Novo" });
    expect(conversasComMensagem(lista, nova2, null)[0]).toMatchObject({
      nome: "Novo",
      naoLidas: 1,
    });
    expect(conversasComMensagem(lista, msg("R", { tipo: "reacao" }), null)).toEqual(lista);
  });

  it("a situação só avança", () => {
    const lista = [msg("A", { deMim: true, situacao: "ENTREGUE" })];
    expect(comSituacao(lista, "A", "LIDA")[0]!.situacao).toBe("LIDA");
    expect(comSituacao(lista, "A", "ENVIADA")[0]!.situacao).toBe("ENTREGUE");
  });

  it("resume os tipos para a lista", () => {
    expect(resumoDaMensagem({ tipo: "audio", texto: null, reacao: null })).toBe("🎤 Áudio");
    expect(resumoDaMensagem({ tipo: "imagem", texto: "Treino", reacao: null })).toBe(
      "📷 Foto: Treino",
    );
  });
});

describe("CHAT-CA-06: arquivos antes de enviar", () => {
  it("usa os mesmos limites e formatos da API", () => {
    expect(ARQUIVO_MAXIMO_BYTES).toBe(MAXIMO_DA_API);
    expect(TEXTO_MAXIMO).toBe(TEXTO_DA_API);
    expect(FORMATOS_ACEITOS).toEqual(FORMATOS_DA_API);
  });

  it("descobre o tipo pelo formato e recusa o que não pode", () => {
    expect(tipoDoAnexo("image/png")).toBe("imagem");
    expect(tipoDoAnexo("video/mp4")).toBe("video");
    expect(tipoDoAnexo("application/pdf")).toBe("documento");
    expect(tipoDoAnexo("audio/mpeg")).toBe("audio");
    expect(tipoDoAnexo("application/zip")).toBeNull();
    expect(problemaDoArquivo("imagem", "image/png", 1000)).toBeNull();
    expect(problemaDoArquivo("video", "video/mp4", ARQUIVO_MAXIMO_BYTES + 1)).toBe(
      "O arquivo passa de 10 MB.",
    );
    expect(problemaDoArquivo("imagem", "image/gif", 10)).toBe("Tipo de arquivo não aceito.");
    expect(problemaDoArquivo("imagem", "image/png", 0)).toBe("Arquivo vazio.");
  });

  it("mostra tamanho e duração legíveis", () => {
    expect(tamanhoLegivel(500)).toBe("500 B");
    expect(tamanhoLegivel(2048)).toBe("2 KB");
    expect(tamanhoLegivel(5.5 * 1024 * 1024)).toBe("5,5 MB");
    expect(duracao(7)).toBe("0:07");
    expect(duracao(92)).toBe("1:32");
  });
});
