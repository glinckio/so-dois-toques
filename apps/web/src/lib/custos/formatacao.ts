/** Minutos como horas: 90 vira "1h30", 120 vira "2h", 0 vira "0h". */
export function formatarHoras(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, "0")}`;
}

/**
 * Cada valor como parte do maior (0 a 1), para as barras de comparação. Negativos
 * contam pelo tamanho; sem nenhum valor, tudo fica em zero.
 */
export function proporcoes(valores: readonly number[]): number[] {
  const maior = Math.max(0, ...valores.map(Math.abs));
  return valores.map((v) => (maior > 0 ? Math.abs(v) / maior : 0));
}

/** Parte do previsto que já foi paga (0 a 1, ou mais se pagou além); sem previsto, null. */
export function partePaga(pagoCentavos: number, previstoCentavos: number | null): number | null {
  if (previstoCentavos === null || previstoCentavos <= 0) return null;
  return Math.max(0, pagoCentavos) / previstoCentavos;
}
