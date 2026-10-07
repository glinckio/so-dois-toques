export type DiaDaFaixa = { data: string; diaSemana: number; dia: number };

export function deslocar(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** VIVO-CA-06: os sete dias (domingo a sábado) da semana que contém a data. */
export function semanaDe(data: string): DiaDaFaixa[] {
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  const domingo = deslocar(data, -diaSemana);
  return Array.from({ length: 7 }, (_, i) => {
    const d = deslocar(domingo, i);
    return { data: d, diaSemana: i, dia: Number(d.slice(8, 10)) };
  });
}
