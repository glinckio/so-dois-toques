import type { Horario, Nivel } from "./formatacao";
import type { TurmaResumo } from "./tipos";

/** Degraus do nível (1 a 3): o selo mostra o nível também como um sinal de barras. */
export const DEGRAUS_DO_NIVEL: Record<Nivel, 1 | 2 | 3> = {
  INICIANTE: 1,
  INTERMEDIARIO: 2,
  AVANCADO: 3,
};

/** A primeira aula da turma no dia da semana (0 = domingo), ou null se não houver. */
export function aulaDoDia(horarios: readonly Horario[], diaSemana: number): Horario | null {
  return (
    horarios.filter((h) => h.diaSemana === diaSemana).sort((a, b) => a.inicio - b.inicio)[0] ?? null
  );
}

export type ResumoDasTurmas = {
  turmas: number;
  vagas: number;
  ocupadas: number;
  livres: number;
  /** Parte das vagas ocupadas (0 a 1). */
  fracao: number;
  lotadas: number;
  aulasHoje: number;
  /** A aula de hoje que está acontecendo ou é a próxima a começar. */
  proxima: { id: string; nome: string; inicio: number; fim: number; agora: boolean } | null;
};

/** Números do cartão de destaque das turmas: vagas, turmas cheias e a próxima aula do dia. */
export function resumoDasTurmas(
  turmas: readonly TurmaResumo[],
  diaSemana: number,
  minutoAtual: number,
): ResumoDasTurmas {
  const vagas = turmas.reduce((t, x) => t + x.vagas, 0);
  const ocupadas = turmas.reduce((t, x) => t + x.ocupadas, 0);
  const deHoje = turmas
    .filter((t) => t.ativa)
    .flatMap((t) =>
      t.horarios
        .filter((h) => h.diaSemana === diaSemana)
        .map((h) => ({ id: t.id, nome: t.nome, inicio: h.inicio, fim: h.fim })),
    )
    .sort((a, b) => a.inicio - b.inicio);
  const seguinte = deHoje.find((a) => a.fim > minutoAtual);
  return {
    turmas: turmas.length,
    vagas,
    ocupadas,
    livres: Math.max(0, vagas - ocupadas),
    fracao: vagas > 0 ? Math.min(1, ocupadas / vagas) : 0,
    lotadas: turmas.filter((t) => t.vagas > 0 && t.ocupadas >= t.vagas).length,
    aulasHoje: deHoje.length,
    proxima: seguinte ? { ...seguinte, agora: seguinte.inicio <= minutoAtual } : null,
  };
}

/** Idade completa em anos numa data (as duas em "AAAA-MM-DD"); null se não der para calcular. */
export function idadeEm(nascimento: string | null | undefined, hoje: string): number | null {
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascimento ?? "");
  const h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoje);
  if (!n || !h) return null;
  const [, anoN, mesN, diaN] = n.map(Number) as [number, number, number, number];
  const [, anoH, mesH, diaH] = h.map(Number) as [number, number, number, number];
  const idade = anoH - anoN - (mesH < mesN || (mesH === mesN && diaH < diaN) ? 1 : 0);
  return idade >= 0 ? idade : null;
}

/** Inicial para o índice da lista: primeira letra sem acento; o que não é letra vira "#". */
export function inicialDe(nome: string): string {
  const letra = nome
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .charAt(0)
    .toLocaleUpperCase("pt-BR");
  return /^[A-Z]$/.test(letra) ? letra : "#";
}

/** Itens agrupados pela inicial do nome, na ordem em que a primeira de cada letra aparece. */
export function porInicial<T extends { nome: string }>(
  itens: readonly T[],
): { letra: string; itens: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const letra = inicialDe(item.nome);
    grupos.set(letra, [...(grupos.get(letra) ?? []), item]);
  }
  return [...grupos.entries()].map(([letra, doGrupo]) => ({ letra, itens: doGrupo }));
}

/**
 * Valor aproximado de cada aula do plano, em centavos: o mês tem, em média, 52/12
 * semanas. Sem aulas por semana, não há valor por aula.
 */
export function valorPorAula(valorCentavos: number, aulasPorSemana: number): number | null {
  if (aulasPorSemana <= 0) return null;
  return Math.round((valorCentavos * 12) / (aulasPorSemana * 52));
}
