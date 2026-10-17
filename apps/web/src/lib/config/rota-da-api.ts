/** Caminho aceito: começa com uma barra só, sem espaços nem barra invertida. */
const CAMINHO = /^\/(?!\/)[^\s\\]*$/;

/**
 * Endereço de uma rota da API: sempre no host da API (`API_URL`). Recusa endereço absoluto
 * ou começando com `//`, que levariam o servidor a chamar outro host (SSRF).
 */
export function urlDaApi(base: string, rota: string): string {
  if (!CAMINHO.test(rota)) throw new Error("Rota da API inválida");
  return `${new URL(base).origin}${rota}`;
}
