export type Quadra = { id: string; nome: string };

export type Nivel = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";

/** Aula de uma turma no dia; início e fim em minutos desde 00:00. */
export type AulaNaGrade = {
  turmaId: string;
  nome: string;
  nivel: Nivel;
  inicio: number;
  fim: number;
  vagas: number;
  ocupadas: number;
};

/** Bloqueio do dia, em horas inteiras. */
export type BloqueioNaGrade = {
  id: string;
  horaInicio: number;
  horaFim: number;
  motivo: string;
  serieId: string | null;
};

export type Grade = {
  data: string;
  diaSemana: number;
  quadra: Quadra;
  aulas: AulaNaGrade[];
  bloqueios: BloqueioNaGrade[];
};

export type BloqueioDetalhe = {
  id: string;
  data: string;
  horaInicio: number;
  horaFim: number;
  inicio: string;
  motivo: string;
  criadoPor: string;
  criadoEm: string;
  canceladoEm: string | null;
  canceladoPor: string | null;
  motivoCancelamento: string | null;
  serie: { id: string; dataInicio: string; dataFim: string; encerrada: boolean } | null;
};

export type SerieBloqueio = {
  id: string;
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  motivo: string;
  dataInicio: string;
  dataFim: string;
  proximos: number;
};
