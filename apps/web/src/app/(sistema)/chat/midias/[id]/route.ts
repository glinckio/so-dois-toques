import { cabecalhosDaMidia } from "@/lib/chat/midia";
import { chamarApi } from "@/lib/servidor/api";

const ID = /^[A-Za-z0-9_-]{4,64}$/;
const NUMERO = /^\d{10,15}$/;

/**
 * CHAT-CA-10: a mídia de uma mensagem, só para quem está logado e tem acesso ao Chat
 * (a API confere). Nunca fica em endereço público nem em cache compartilhado.
 */
export async function GET(request: Request, { params }: RouteContext<"/chat/midias/[id]">) {
  const { id } = await params;
  const numero = new URL(request.url).searchParams.get("numero") ?? "";
  if (!ID.test(id) || !NUMERO.test(numero)) return new Response(null, { status: 400 });
  const resposta = await chamarApi<{ base64: string; mimetype: string }>(
    `/chat/midias/${id}?numero=${numero}`,
    { tempoMs: 60_000 },
  );
  if (!resposta.ok) return new Response(null, { status: resposta.status });
  const download = new URL(request.url).searchParams.has("baixar");
  return new Response(Buffer.from(resposta.dados.base64, "base64"), {
    headers: cabecalhosDaMidia(resposta.dados.mimetype, id, download),
  });
}
