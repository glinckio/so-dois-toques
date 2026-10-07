import { somarDias } from "./formatacao";
import type { Faixa } from "./tipos";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Data "AAAA-MM-DD" que existe no calendário. */
function dataValida(data: string): boolean {
  if (!DATA.test(data)) return false;
  const d = new Date(`${data}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

export type PreviaDoValor = {
  horaInicio: number;
  horaFim: number;
  /** Preço de cada hora; null quando a hora está fora do funcionamento. */
  horas: { hora: number; valorCentavos: number | null }[];
  /** Soma das horas; null se alguma hora está fora do funcionamento. */
  totalCentavos: number | null;
};

/**
 * Prévia do valor da reserva na tela de nova reserva: soma o preço de cada hora pela
 * faixa do dia da semana, como a API faz (HOR-CA-03). É só uma prévia: o valor que
 * vale é o que a API calcula ao criar.
 */
export function previaDoValor(
  faixas: readonly Pick<Faixa, "diaSemana" | "horaInicio" | "horaFim" | "valorHoraCentavos">[],
  data: string,
  horaInicio: number,
  duracao: number,
): PreviaDoValor | null {
  if (!dataValida(data) || !Number.isInteger(horaInicio) || !Number.isInteger(duracao)) return null;
  if (horaInicio < 0 || horaInicio > 23 || duracao < 1) return null;
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  const doDia = faixas.filter((f) => f.diaSemana === diaSemana);
  const horas = Array.from({ length: duracao }, (_, i) => {
    const hora = horaInicio + i;
    const faixa = doDia.find((f) => f.horaInicio <= hora && hora < f.horaFim);
    return { hora, valorCentavos: faixa ? faixa.valorHoraCentavos : null };
  });
  const foraDoHorario = horas.some((h) => h.valorCentavos === null);
  return {
    horaInicio,
    horaFim: horaInicio + duracao,
    horas,
    totalCentavos: foraDoHorario ? null : horas.reduce((t, h) => t + (h.valorCentavos ?? 0), 0),
  };
}

/** HOR-CA-05: quantas datas a reserva fixa terá, uma por semana, do primeiro ao último dia. */
export function semanasDaSerie(dataInicio: string, dataFim: string): number {
  if (!dataValida(dataInicio) || !dataValida(dataFim) || dataFim < dataInicio) return 0;
  let semanas = 0;
  for (let d = dataInicio; d <= dataFim; d = somarDias(d, 7)) semanas += 1;
  return semanas;
}

/** Limite de datas de uma reserva fixa (o mesmo da API). */
export const SEMANAS_MAXIMAS = 26;
