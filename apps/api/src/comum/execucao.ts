import { resolve, win32 } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Diz se o módulo foi chamado direto pelo node (`node arquivo.js`), e não
 * importado por um teste. Compara URLs normalizadas: no Windows o caminho
 * vem como "E:\pasta\arquivo.js" e a URL como "file:///E:/pasta/arquivo.js",
 * e espaços viram "%20" nos dois sistemas.
 */
export function ehExecucaoDireta(
  urlDoModulo: string,
  caminhoExecutado: string | undefined,
  windows = process.platform === "win32",
): boolean {
  if (!caminhoExecutado) return false;
  const absoluto = windows ? win32.resolve(caminhoExecutado) : resolve(caminhoExecutado);
  return pathToFileURL(absoluto, { windows }).href === urlDoModulo;
}
