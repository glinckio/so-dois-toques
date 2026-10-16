/** Etapa 20: regras de entrega das mídias e dos envios do Chat (servidor). */

/** Formatos que o navegador pode mostrar dentro da página sem risco (sem SVG nem HTML). */
const SEGUROS_NA_PAGINA =
  /^(image\/(jpeg|png|webp|gif)|video\/(mp4|3gpp|webm)|audio\/[a-z0-9.+-]+)$/;

/**
 * CHAT-CA-10: cabeçalhos da mídia recebida. Foto, vídeo e áudio abrem na página; o resto
 * (documento, SVG, HTML) só baixa, como arquivo binário e numa caixa de areia, para um
 * arquivo recebido nunca rodar dentro do sistema. Cache só no navegador da pessoa.
 */
export function cabecalhosDaMidia(mimetype: string, id: string, baixar: boolean): Headers {
  const formato = mimetype.split(";")[0]!.trim().toLowerCase();
  const naPagina = SEGUROS_NA_PAGINA.test(formato) && !baixar;
  const cabecalhos = new Headers({
    "Content-Type": naPagina ? formato : "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "X-Content-Type-Options": "nosniff",
  });
  cabecalhos.set(
    "Content-Disposition",
    naPagina ? "inline" : `attachment; filename="${nomeDoArquivo(formato, id)}"`,
  );
  return cabecalhos;
}

const EXTENSOES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

/** Nome do arquivo baixado: só o identificador e a extensão conhecida. */
export function nomeDoArquivo(formato: string, id: string): string {
  const extensao = EXTENSOES[formato] ?? "bin";
  return `whatsapp-${id.replace(/[^A-Za-z0-9_-]/g, "")}.${extensao}`;
}

/**
 * Envio de arquivo pelo route handler: só aceita pedido do próprio sistema (o navegador
 * manda a origem da página). Protege contra outro site postando com o cookie da pessoa.
 */
export function origemConfere(cabecalhos: Headers): boolean {
  const origem = cabecalhos.get("origin");
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  if (!origem || !host) return false;
  try {
    return new URL(origem).host === host.split(",")[0]!.trim();
  } catch {
    return false;
  }
}

/** Hosts das fotos de perfil (CDN do WhatsApp). */
export function fotoPermitida(url: string): boolean {
  try {
    const endereco = new URL(url);
    return endereco.protocol === "https:" && /(^|\.)whatsapp\.net$/.test(endereco.hostname);
  } catch {
    return false;
  }
}
