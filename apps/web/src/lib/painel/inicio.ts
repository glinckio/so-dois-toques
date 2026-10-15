/**
 * Variação percentual em relação ao mês anterior, com uma casa. Sem base
 * (mês anterior zerado) não há variação.
 */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10;
}

/** Minutos desde a meia-noite em São Paulo (14:35 vira 875). */
export function minutoEmSaoPaulo(agora = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return valor("hour") * 60 + valor("minute");
}

export type Momento = "passou" | "agora" | "depois";

/** Situação de algo que vai de `inicio` a `fim` (minutos) em relação ao minuto atual. */
export function momentoDe(inicio: number, fim: number, agora: number): Momento {
  if (agora >= fim) return "passou";
  if (agora >= inicio) return "agora";
  return "depois";
}

/** FOCO-CA-10: anéis do dia a partir das aulas da agenda (dadas e alunos esperados). */
export function resumoDasAulas(
  aulas: readonly { inicio: number; fim: number; vagas: number; ocupadas: number }[],
  minutoAtual: number,
) {
  return {
    total: aulas.length,
    dadas: aulas.filter((a) => momentoDe(a.inicio, a.fim, minutoAtual) === "passou").length,
    alunos: aulas.reduce((t, a) => t + a.ocupadas, 0),
    vagas: aulas.reduce((t, a) => t + a.vagas, 0),
  };
}
