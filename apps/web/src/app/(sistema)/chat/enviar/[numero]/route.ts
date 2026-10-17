import { NextResponse } from "next/server";
import { problemaDoArquivo, type TipoDeArquivo } from "@/lib/chat/conversa";
import { origemConfere } from "@/lib/chat/midia";
import { chamarApi } from "@/lib/servidor/api";

const NUMERO = /^\d{10,15}$/;
const ID = /^[A-Za-z0-9_-]{4,64}$/;
const TIPOS: readonly TipoDeArquivo[] = ["imagem", "video", "documento", "audio", "figurinha"];

const erro = (mensagem: string, status = 400) => NextResponse.json({ mensagem }, { status });

/**
 * CHAT-CA-06: envio de arquivo (imagem, vídeo, documento, áudio gravado ou figurinha) em
 * multipart. O servidor confere a origem, o tipo e o tamanho e manda para a API em base64.
 */
export async function POST(request: Request, { params }: RouteContext<"/chat/enviar/[numero]">) {
  if (!origemConfere(request.headers)) return erro("Pedido recusado.", 403);
  const { numero } = await params;
  if (!NUMERO.test(numero)) return erro("Conversa inválida.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Arquivo inválido.");
  }
  const tipo = String(form.get("tipo") ?? "") as TipoDeArquivo;
  if (!TIPOS.includes(tipo)) return erro("Tipo de envio inválido.");
  const citadaId = String(form.get("citadaId") ?? "");
  const legenda = String(form.get("legenda") ?? "").trim();
  const deMensagemId = String(form.get("deMensagemId") ?? "");
  const arquivo = form.get("arquivo");

  const corpo: Record<string, unknown> = { tipo };
  if (citadaId) {
    if (!ID.test(citadaId)) return erro("Mensagem citada inválida.");
    corpo["citadaId"] = citadaId;
  }
  if (legenda && tipo !== "audio" && tipo !== "figurinha") corpo["legenda"] = legenda;

  if (tipo === "figurinha" && deMensagemId) {
    if (!ID.test(deMensagemId)) return erro("Figurinha inválida.");
    corpo["deMensagemId"] = deMensagemId;
  } else {
    if (!(arquivo instanceof File)) return erro("Escolha um arquivo.");
    const problema = problemaDoArquivo(tipo, arquivo.type, arquivo.size);
    if (problema) return erro(problema);
    corpo["arquivo"] = {
      base64: Buffer.from(await arquivo.arrayBuffer()).toString("base64"),
      mimetype: arquivo.type,
      nome: arquivo.name.slice(0, 200) || "arquivo",
    };
  }

  const resposta = await chamarApi(`/chat/conversas/${numero}/mensagens`, {
    metodo: "POST",
    corpo,
    tempoMs: 120_000,
  });
  if (!resposta.ok) {
    return erro(resposta.campos?.[0]?.mensagem ?? resposta.mensagem, resposta.status);
  }
  return NextResponse.json(resposta.dados, { status: 201 });
}
