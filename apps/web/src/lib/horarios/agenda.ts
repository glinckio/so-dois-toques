import { NIVEIS as NOMES_DOS_NIVEIS } from "@/lib/aulas/formatacao";
import { faixaDeMinutos, HORA_ABRE, HORA_FECHA } from "./formatacao";
import type { AulaNaGrade, BloqueioNaGrade, Grade } from "./tipos";

/** Cada linha da agenda é um quarto de hora: das 05h às 24h são 76 linhas. */
export const MINUTOS_POR_LINHA = 15;
const ABRE = HORA_ABRE * 60;
const FECHA = HORA_FECHA * 60;
export const LINHAS_DA_AGENDA = (FECHA - ABRE) / MINUTOS_POR_LINHA;

/** Cor do bloco na agenda (sempre acompanhada de texto). */
export type SituacaoDoHorario = "aula" | "bloqueio";

export const ROTULOS_DA_SITUACAO: Record<SituacaoDoHorario | "livre", string> = {
  aula: "Aula",
  bloqueio: "Bloqueio",
  livre: "Livre",
};

export type MomentoDoBloco = "passou" | "agora" | "depois";

export type BlocoDaAgenda =
  | (BaseDoBloco & { tipo: "aula"; aula: AulaNaGrade })
  | (BaseDoBloco & { tipo: "bloqueio"; bloqueio: BloqueioNaGrade });

type BaseDoBloco = {
  situacao: SituacaoDoHorario;
  /** Minutos desde 00:00. */
  inicio: number;
  fim: number;
  /** Linha da agenda em que o bloco começa (1 = 05:00). */
  linha: number;
  /** Quantas linhas (quartos de hora) o bloco ocupa. */
  linhas: number;
  momento: MomentoDoBloco;
};

/** Hora inteira sem aula nem bloqueio. */
export type LivreDaAgenda = { tipo: "livre"; hora: number; linha: number; passou: boolean };

export type HoraDaAgenda = { hora: number; linha: number; passou: boolean; agora: boolean };

export type Agenda = {
  horas: HoraDaAgenda[];
  blocos: BlocoDaAgenda[];
  livres: LivreDaAgenda[];
  /** Linha do quarto de hora atual, quando a data é hoje e a quadra está aberta. */
  agora: { linha: number } | null;
  minutosDeAula: number;
  minutosBloqueados: number;
  /** Fração do dia ocupada por aulas e bloqueios (0 a 1). */
  ocupacao: number;
  /** Horas inteiras livres que ainda não começaram. */
  livresParaBloquear: number;
};

const linhaDe = (minuto: number) =>
  Math.min(LINHAS_DA_AGENDA, Math.max(1, Math.floor((minuto - ABRE) / MINUTOS_POR_LINHA) + 1));

function linhasEntre(inicio: number, fim: number) {
  const primeira = linhaDe(inicio);
  const ultima = Math.min(
    LINHAS_DA_AGENDA,
    Math.ceil((Math.min(fim, FECHA) - ABRE) / MINUTOS_POR_LINHA),
  );
  return Math.max(1, ultima - primeira + 1);
}

function momentoDe(data: string, hoje: string, minutoAtual: number, inicio: number, fim: number) {
  if (data !== hoje) return data < hoje ? "passou" : "depois";
  if (minutoAtual >= fim) return "passou";
  if (minutoAtual >= inicio) return "agora";
  return "depois";
}

/** Descrição curta do bloco para leitores de tela e listas. */
export function descreverBloco(bloco: BlocoDaAgenda): string {
  const horario = faixaDeMinutos(bloco.inicio, bloco.fim);
  if (bloco.tipo === "bloqueio") return `Bloqueado: ${bloco.bloqueio.motivo}, ${horario}`;
  const a = bloco.aula;
  return `Aula ${NOMES_DOS_NIVEIS[a.nivel]}, ${horario}, ${a.ocupadas} de ${a.vagas} alunos`;
}

/**
 * FOCO-CA-05: a agenda do dia da quadra. Cada quarto de hora é uma linha; a aula ou o
 * bloqueio vira um bloco que ocupa as suas linhas, e cada hora inteira sem nada é uma
 * célula livre.
 */
export function agendaDoDia(grade: Grade, hoje: string, minutoAtual: number): Agenda {
  const passou = (minuto: number) =>
    grade.data < hoje || (grade.data === hoje && minuto <= minutoAtual);
  const bloco = <T extends object>(inicio: number, fim: number, extra: T) => ({
    inicio,
    fim,
    linha: linhaDe(inicio),
    linhas: linhasEntre(inicio, fim),
    momento: momentoDe(grade.data, hoje, minutoAtual, inicio, fim) as MomentoDoBloco,
    ...extra,
  });
  const blocos: BlocoDaAgenda[] = [
    ...grade.aulas.map((aula) =>
      bloco(aula.inicio, aula.fim, {
        tipo: "aula" as const,
        aula,
        situacao: "aula" as SituacaoDoHorario,
      }),
    ),
    ...grade.bloqueios.map((b) =>
      bloco(b.horaInicio * 60, b.horaFim * 60, {
        tipo: "bloqueio" as const,
        bloqueio: b,
        situacao: "bloqueio" as SituacaoDoHorario,
      }),
    ),
  ].sort((a, b) => a.inicio - b.inicio);

  const horas: HoraDaAgenda[] = [];
  const livres: LivreDaAgenda[] = [];
  for (let hora = HORA_ABRE; hora < HORA_FECHA; hora++) {
    const linha = linhaDe(hora * 60);
    horas.push({
      hora,
      linha,
      passou: passou(hora * 60),
      agora: grade.data === hoje && Math.floor(minutoAtual / 60) === hora,
    });
    const ocupada = blocos.some((b) => b.inicio < (hora + 1) * 60 && hora * 60 < b.fim);
    if (!ocupada) livres.push({ tipo: "livre", hora, linha, passou: passou(hora * 60) });
  }

  const minutos = (tipo: BlocoDaAgenda["tipo"]) =>
    blocos.filter((b) => b.tipo === tipo).reduce((t, b) => t + (b.fim - b.inicio), 0);
  const minutosDeAula = minutos("aula");
  const minutosBloqueados = minutos("bloqueio");
  const aberto = grade.data === hoje && minutoAtual >= ABRE && minutoAtual < FECHA;
  return {
    horas,
    blocos,
    livres,
    agora: aberto ? { linha: linhaDe(minutoAtual) } : null,
    minutosDeAula,
    minutosBloqueados,
    ocupacao: Math.min(1, (minutosDeAula + minutosBloqueados) / (FECHA - ABRE)),
    livresParaBloquear: livres.filter((l) => !l.passou).length,
  };
}
