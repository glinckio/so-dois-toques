import { timingSafeEqual } from "node:crypto";

/** Compara segredos em tempo constante. */
export function segredosIguais(recebido: unknown, esperado: string | undefined): boolean {
  if (typeof recebido !== "string" || !esperado) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
