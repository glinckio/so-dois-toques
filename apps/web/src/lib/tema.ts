/**
 * Cores do tema, tiradas do logo do Só Dois Toques. Os mesmos valores estão em
 * src/app/globals.css (@theme); o teste confere que os dois batem e que o
 * contraste atende a WCAG AA (VIS-CA-01).
 */
export const CORES = {
  noite: "#04020e",
  fundo: "#07041a",
  cartao: "#120c2b",
  elevado: "#1b1440",
  borda: "#2c2354",
  texto: "#f4f2ff",
  suave: "#c4bddf",
  apagado: "#9d96bb",
  roxo: "#a667fc",
  "roxo-claro": "#cdb2ff",
  "roxo-forte": "#7c3aed",
  ouro: "#e9ab02",
  areia: "#e8c99a",
  sucesso: "#34d399",
  perigo: "#f87171",
  "serie-1": "#a667fc",
  "serie-2": "#c98500",
  "serie-3": "#2b9fd6",
  "serie-4": "#d9589a",
} as const;

export type Cor = keyof typeof CORES;

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG 2.x). */
export function luminancia(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}
