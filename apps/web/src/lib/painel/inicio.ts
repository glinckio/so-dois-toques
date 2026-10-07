import type { TurmaResumo } from "@/lib/aulas/tipos";
import type { Grade, ReservaNaGrade } from "@/lib/horarios/tipos";

/**
 * Variação percentual em relação ao mês anterior, com uma casa. Sem base
 * (mês anterior zerado) não há variação.
 */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10;
}

export type TurmaDeHoje = { turma: TurmaResumo; inicio: number; fim: number };

/** Turmas ativas com aula no dia da semana, pela hora de início. */
export function turmasDoDia(turmas: readonly TurmaResumo[], diaSemana: number): TurmaDeHoje[] {
  return turmas
    .filter((t) => t.ativa)
    .flatMap((turma) =>
      turma.horarios
        .filter((h) => h.diaSemana === diaSemana)
        .map((h) => ({ turma, inicio: h.inicio, fim: h.fim })),
    )
    .sort((a, b) => a.inicio - b.inicio);
}

export type ReservaDeHoje = ReservaNaGrade & { quadra: string };

/** Reservas de clientes (sem bloqueios) do dia, das duas quadras, pela hora. */
export function reservasDoDia(grade: Grade): ReservaDeHoje[] {
  return grade.quadras
    .flatMap((q) => q.reservas.map((r) => ({ ...r, quadra: q.nome })))
    .filter((r) => r.tipo === "RESERVA")
    .sort((a, b) => a.horaInicio - b.horaInicio || a.quadra.localeCompare(b.quadra));
}

/** Horas reservadas e horas em funcionamento no dia, somando as quadras. */
export function ocupacaoDoDia(grade: Grade): { reservadas: number; abertas: number } {
  const horasAbertas = grade.faixas.reduce((t, f) => t + (f.horaFim - f.horaInicio), 0);
  const reservadas = grade.quadras.reduce(
    (t, q) =>
      t +
      q.reservas
        .filter((r) => r.tipo === "RESERVA")
        .reduce((s, r) => s + (r.horaFim - r.horaInicio), 0),
    0,
  );
  return { reservadas, abertas: horasAbertas * grade.quadras.length };
}
