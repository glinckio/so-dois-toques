/** Regras puras de horas e custos das quadras parceiras (Etapa 4). Sem acesso a banco. */

import type { Horario } from "../aulas/regras.js";
import { primeiroDia, proximaCompetencia } from "../mensalidades/regras.js";

export const VALOR_HORA_MINIMO = 100;
export const VALOR_HORA_MAXIMO = 200_000;

export type TurmaNoMes = {
  horarios: Horario[];
  /** "AAAA-MM-DD": primeiro dia com aula. */
  inicio: string;
  /** "AAAA-MM-DD": dia do encerramento (não tem aula), ou null se ativa. */
  encerradaEm: string | null;
};

function diasDoMes(competencia: string): number {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * CUSTO-CA-02: minutos de aula da turma no mês. Cada dia do mês conta os horários
 * daquele dia da semana, a partir do início da turma e antes do encerramento.
 */
export function minutosDaTurmaNoMes(turma: TurmaNoMes, competencia: string): number {
  const [ano, mes] = competencia.split("-").map(Number) as [number, number];
  let total = 0;
  for (let dia = 1; dia <= diasDoMes(competencia); dia += 1) {
    const data = `${competencia}-${String(dia).padStart(2, "0")}`;
    if (data < turma.inicio) continue;
    if (turma.encerradaEm !== null && data >= turma.encerradaEm) continue;
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
    for (const h of turma.horarios) {
      if (h.diaSemana === diaSemana) total += h.fim - h.inicio;
    }
  }
  return total;
}

/** CUSTO-CA-02: horas × valor da hora, arredondado ao centavo. */
export function custoPrevisto(minutos: number, valorHoraCentavos: number): number {
  return Math.round((minutos * valorHoraCentavos) / 60);
}

/**
 * Divide um valor em centavos na proporção dos pesos, pelo maior resto: a soma das
 * partes é sempre o total. Funciona com total negativo (estorno divide igual ao
 * pagamento, com sinal trocado). Pesos todos zero devolvem null.
 */
export function ratear(total: number, pesos: readonly number[]): number[] | null {
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (pesos.length === 0 || somaPesos <= 0) return null;
  const sinal = total < 0 ? -1 : 1;
  const absoluto = Math.abs(total);
  const exatos = pesos.map((p) => (absoluto * p) / somaPesos);
  const partes = exatos.map(Math.floor);
  let sobra = absoluto - partes.reduce((a, b) => a + b, 0);
  // Maior resto primeiro; empate fica com quem vem antes.
  const ordem = exatos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of ordem) {
    if (sobra === 0) break;
    partes[i] = (partes[i] ?? 0) + 1;
    sobra -= 1;
  }
  return partes.map((p) => (p === 0 ? 0 : p * sinal));
}

/** Divide em n partes iguais (as primeiras levam o centavo que sobra). */
export function ratearIgual(total: number, n: number): number[] | null {
  return ratear(
    total,
    Array.from({ length: n }, () => 1),
  );
}

/** A matrícula vale no mês quando teve ao menos um dia nele (fim é exclusivo). */
export function matriculaValeNoMes(
  matricula: { inicio: string; fim: string | null },
  competencia: string,
): boolean {
  const primeiro = primeiroDia(competencia);
  const seguinte = primeiroDia(proximaCompetencia(competencia));
  if (matricula.inicio >= seguinte) return false;
  if (matricula.fim === null) return true;
  return matricula.fim > primeiro && matricula.fim > matricula.inicio;
}
