import { fotoPermitida } from "@/lib/chat/midia";
import { chamarApi } from "@/lib/servidor/api";

const NUMERO = /^\d{10,15}$/;
const FORMATOS = /^image\/(jpeg|png|webp)$/;

/**
 * Foto de perfil do contato: o servidor busca no CDN do WhatsApp e entrega ao navegador,
 * que só fala com o sistema (a CSP não libera imagens de fora).
 */
export async function GET(_: Request, { params }: RouteContext<"/chat/fotos/[numero]">) {
  const { numero } = await params;
  if (!NUMERO.test(numero)) return new Response(null, { status: 400 });
  const resposta = await chamarApi<{ url: string | null }>(`/chat/fotos/${numero}`);
  const url = resposta.ok ? resposta.dados.url : null;
  if (!url || !fotoPermitida(url)) return new Response(null, { status: 404 });
  try {
    const foto = await fetch(url, { signal: AbortSignal.timeout(5_000), redirect: "error" });
    const formato = foto.headers.get("content-type")?.split(";")[0] ?? "";
    if (!foto.ok || !FORMATOS.test(formato)) return new Response(null, { status: 404 });
    return new Response(await foto.arrayBuffer(), {
      headers: {
        "Content-Type": formato,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
