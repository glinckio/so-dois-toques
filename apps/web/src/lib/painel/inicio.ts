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

export type BlocoDoMapa = {
  id: string;
  tipo: ReservaNaGrade["tipo"];
  inicio: number;
  fim: number;
  pago: boolean;
  rotulo: string;
};

export type MapaDoDia = {
  /** Primeira e última hora de funcionamento do dia. */
  inicio: number;
  fim: number;
  quadras: { id: string; nome: string; blocos: BlocoDoMapa[] }[];
};

/**
 * Mapa do dia das quadras (Início): uma faixa por quadra, da primeira à última hora
 * de funcionamento, com as reservas e bloqueios no lugar. Sem horário, não há mapa.
 */
export function mapaDoDia(grade: Grade): MapaDoDia | null {
  if (grade.faixas.length === 0) return null;
  const inicio = Math.min(...grade.faixas.map((f) => f.horaInicio));
  const fim = Math.max(...grade.faixas.map((f) => f.horaFim));
  return {
    inicio,
    fim,
    quadras: grade.quadras.map((q) => ({
      id: q.id,
      nome: q.nome,
      blocos: q.reservas
        .map((r) => ({
          id: r.id,
          tipo: r.tipo,
          inicio: Math.max(inicio, r.horaInicio),
          fim: Math.min(fim, r.horaFim),
          pago: r.pago,
          rotulo: r.tipo === "RESERVA" ? (r.clienteNome ?? "Reserva") : (r.motivo ?? "Bloqueado"),
        }))
        .filter((b) => b.fim > b.inicio)
        .sort((a, b) => a.inicio - b.inicio),
    })),
  };
}

/** Reservas que ainda não terminaram, pela hora (as próximas da recepção). */
export function proximasReservas(
  reservas: readonly ReservaDeHoje[],
  minutoAtual: number,
): ReservaDeHoje[] {
  return reservas.filter((r) => r.horaFim * 60 > minutoAtual);
}
