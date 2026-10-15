/** A quadra abre das 05h às 24h, o mesmo limite dos horários de turma (FOCO-CA-05). */
export const HORA_ABRE = 5;
export const HORA_FECHA = 24;
/** Horas em que um bloqueio pode começar (05h a 23h) ou terminar (06h a 24h). */
export const HORAS_DE_INICIO = Array.from(
  { length: HORA_FECHA - HORA_ABRE },
  (_, i) => HORA_ABRE + i,
);
export const HORAS_DE_FIM = HORAS_DE_INICIO.map((h) => h + 1);
export const SEMANAS_MAXIMAS = 26;

/** 19 → "19:00"; 24 → "24:00" (meia-noite do fim do dia). */
export function rotuloHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

export function faixaDeHoras(inicio: number, fim: number): string {
  return `${rotuloHora(inicio)} às ${rotuloHora(fim)}`;
}

/** 1110 → "18:30". */
export function rotuloMinuto(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function faixaDeMinutos(inicio: number, fim: number): string {
  return `${rotuloMinuto(inicio)} às ${rotuloMinuto(fim)}`;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Hora que já começou no dia de hoje (em São Paulo) não aceita bloqueio. */
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

/** Milissegundos até o início do horário (negativo se já começou). */
export function tempoAteInicio(inicio: string, agora = new Date()): number {
  return new Date(inicio).getTime() - agora.getTime();
}

/** Quantas datas do mesmo dia da semana cabem entre início e fim (inclusive). */
export function semanasDaSerie(dataInicio: string, dataFim: string): number {
  if (!dataInicio || !dataFim || dataFim < dataInicio) return 0;
  const dias =
    (Date.parse(`${dataFim}T12:00:00Z`) - Date.parse(`${dataInicio}T12:00:00Z`)) / 86_400_000;
  return Math.floor(dias / 7) + 1;
}
