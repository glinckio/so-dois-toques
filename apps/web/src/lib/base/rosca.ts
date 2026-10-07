export type Fatia = { inicio: number; tamanho: number; percentual: number };

/**
 * Fatias da rosca em uma escala de 0 a 100 (o `pathLength` do círculo), na ordem
 * dos valores, com uma pequena folga entre elas. Valores zerados não viram fatia.
 */
export function fatiasDaRosca(valores: readonly number[], folga = 1.6): Fatia[] {
  const total = valores.reduce((t, v) => t + Math.max(0, v), 0);
  if (total <= 0) return [];
  const positivos = valores.filter((v) => v > 0).length;
  const espaco = positivos > 1 ? folga : 0;
  let inicio = 0;
  return valores.map((valor) => {
    const percentual = (Math.max(0, valor) / total) * 100;
    const fatia = { inicio, tamanho: Math.max(0, percentual - espaco), percentual };
    inicio += percentual;
    return fatia;
  });
}
