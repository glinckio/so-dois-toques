import type { ReservaNaGrade } from "./tipos";

export const DURACAO_MAXIMA = 4;
export const HORAS = Array.from({ length: 24 }, (_, h) => h);

/** 19 → "19:00"; 24 → "24:00" (meia-noite do fim do dia). */
export function rotuloHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

export function faixaDeHoras(inicio: number, fim: number): string {
  return `${rotuloHora(inicio)} às ${rotuloHora(fim)}`;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** HOR-CA-02: as horas em que a quadra funciona no dia, pelas faixas. */
export function horasDeFuncionamento(faixas: readonly { horaInicio: number; horaFim: number }[]) {
  const horas = new Set<number>();
  for (const f of faixas) for (let h = f.horaInicio; h < f.horaFim; h++) horas.add(h);
  return [...horas].sort((a, b) => a - b);
}

export type Celula =
  | { hora: number; tipo: "livre" }
  | { hora: number; tipo: "ocupada"; reserva: ReservaNaGrade; primeira: boolean };

/** HOR-CA-02: cada hora de funcionamento da quadra, livre ou com a ocupação que a cobre. */
export function celulasDaQuadra(horas: readonly number[], reservas: readonly ReservaNaGrade[]) {
  return horas.map((hora): Celula => {
    const reserva = reservas.find((r) => r.horaInicio <= hora && hora < r.horaFim);
    return reserva
      ? { hora, tipo: "ocupada", reserva, primeira: reserva.horaInicio === hora }
      : { hora, tipo: "livre" };
  });
}

/** Hora que já começou no dia de hoje (em São Paulo) não aceita reserva. */
export function horaPassou(data: string, hora: number, hoje: string, horaAgora: number) {
  return data < hoje || (data === hoje && hora <= horaAgora);
}

export function horaAgoraEmSaoPaulo(agora = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(agora),
  );
}

/** Milissegundos até o início da reserva (negativo se já começou). */
export function tempoAteInicio(inicio: string, agora = new Date()): number {
  return new Date(inicio).getTime() - agora.getTime();
}
