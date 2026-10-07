import type { Faixa } from "./tipos";

/** 0 = preço mais baixo, 1 = intermediário, 2 = mais alto (horário nobre). */
export type NivelDoPreco = 0 | 1 | 2;

/**
 * Nível do preço da hora entre todos os preços cadastrados, para a cor da faixa na
 * linha do dia. Com um preço só, todas as faixas ficam no mesmo nível.
 */
export function nivelDoPreco(valor: number, todos: readonly number[]): NivelDoPreco {
  const distintos = [...new Set(todos)];
  if (distintos.length < 2) return 0;
  const menor = Math.min(...distintos);
  const maior = Math.max(...distintos);
  if (valor <= menor) return 0;
  if (valor >= maior) return 2;
  return 1;
}

/** As faixas de um dia da semana, pela hora de início. */
export function faixasDoDia<T extends Pick<Faixa, "diaSemana" | "horaInicio">>(
  faixas: readonly T[],
  diaSemana: number,
): T[] {
  return faixas
    .filter((f) => f.diaSemana === diaSemana)
    .sort((a, b) => a.horaInicio - b.horaInicio);
}

/** Horas de funcionamento somadas no dia. */
export function horasAbertasNoDia(
  faixas: readonly Pick<Faixa, "horaInicio" | "horaFim">[],
): number {
  return faixas.reduce((t, f) => t + (f.horaFim - f.horaInicio), 0);
}
