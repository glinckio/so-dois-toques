/** Endereço do webhook automático da instância, já com o token (CHAT-CA-02). */
export function urlDoWebhook(base: string | undefined, token: string | undefined): string | null {
  const limpa = base?.trim().replace(/\/+$/, "");
  if (!limpa || !token) return null;
  return `${limpa}/evolution/webhook?token=${encodeURIComponent(token)}`;
}

/** Endereço do webhook para o log: sem a query, que leva o token (CHAT-CA-02). */
export function semToken(destino: string): string {
  return destino.split("?")[0]!;
}
