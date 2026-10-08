export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Hash do único estilo embutido liberado: `display:none`. O React escreve
 * `<svg aria-hidden="true" style="display:none">` quando a transmissão da página
 * parte o conteúdo de um SVG (anéis, barras) em pedaços; sem o hash, o navegador
 * recusa o atributo e acusa erro de CSP (VIVO-CA-11).
 */
export const HASH_ESTILO_OCULTO = "sha256-aqNNdDLnnrDOnTNdkJpYlAxKVJtLt9CtFLklmInuUAE=";

/**
 * Monta a Content-Security-Policy com nonce por requisição.
 * Em desenvolvimento o React precisa de 'unsafe-eval' e estilos inline;
 * em produção nada inline roda sem o nonce.
 */
export function buildCsp(nonce: string, { isDev }: { isDev: boolean }): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    ...(isDev ? [] : [`style-src-attr 'unsafe-hashes' '${HASH_ESTILO_OCULTO}'`]),
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}
