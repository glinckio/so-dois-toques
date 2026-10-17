import { abrirStreamDaApi } from "@/lib/servidor/api";

/**
 * CHAT-CA-08: repassa ao navegador os eventos do Chat (mensagens novas, situação e conexão)
 * que a API recebe do WhatsApp. Fechar a aba fecha a conexão com a API.
 */
export async function GET(request: Request) {
  const resposta = await abrirStreamDaApi("/chat/eventos", request.signal);
  if (!resposta?.ok || !resposta.body) {
    return new Response(null, { status: resposta?.status === 403 ? 403 : 502 });
  }
  return new Response(resposta.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
