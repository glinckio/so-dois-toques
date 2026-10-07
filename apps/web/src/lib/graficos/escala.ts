/** Escala de eixo com valores redondos (1, 2, 2,5 ou 5 × 10ⁿ), começando em zero. */
export function escalaDoEixo(maximo: number, marcas = 4): { teto: number; passos: number[] } {
  if (!(maximo > 0)) return { teto: 1, passos: [0, 1] };
  const bruto = maximo / marcas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  const teto = Math.ceil(maximo / passo) * passo;
  const passos = Array.from({ length: Math.round(teto / passo) + 1 }, (_, i) => i * passo);
  return { teto, passos };
}

/** Rótulo curto de dinheiro para o eixo: "R$ 0", "R$ 800", "R$ 1,5 mil", "R$ 12 mil". */
export function reaisCurto(centavos: number): string {
  const reais = centavos / 100;
  if (Math.abs(reais) >= 1000) {
    const mil = reais / 1000;
    return `R$ ${mil.toLocaleString("pt-BR", { maximumFractionDigits: mil < 10 ? 1 : 0 })} mil`;
  }
  return `R$ ${Math.round(reais).toLocaleString("pt-BR")}`;
}

/** Mês curto em português a partir de "AAAA-MM": "out". */
export function mesCurto(competencia: string): string {
  const mes = Number(competencia.slice(5, 7));
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][
    mes - 1
  ]!;
}

export type Minigrafico = { linha: string; area: string; ultimo: { x: number; y: number } };

/**
 * Caminho do minigráfico dos cartões de número: a linha dos valores em
 * `largura` × `altura`, com uma folga em cima e embaixo, e a área sob ela.
 * Com menos de dois valores não há linha.
 */
export function minigrafico(
  valores: readonly number[],
  largura: number,
  altura: number,
  folga = 4,
): Minigrafico | null {
  if (valores.length < 2) return null;
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const faixa = maior - menor || 1;
  const pontos = valores.map((v, i) => ({
    x: Math.round((i / (valores.length - 1)) * largura * 10) / 10,
    y:
      maior === menor
        ? altura / 2
        : Math.round((folga + (1 - (v - menor) / faixa) * (altura - 2 * folga)) * 10) / 10,
  }));
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return { linha, area: `${linha} L${largura},${altura} L0,${altura} Z`, ultimo: pontos.at(-1)! };
}
