import {
  dataValida,
  diaDaSemana,
  horariosSobrepostos,
  paraDataDoBanco,
  type Horario,
} from "../aulas/regras.js";

/** A grade e os bloqueios vão das 05h às 24h, o mesmo limite dos horários de turma. */
export const HORA_ABRE = 5;
export const HORA_FECHA = 24;
export const DIAS_DE_ANTECEDENCIA = 180;
export const OCORRENCIAS_MAXIMAS = 26;

/**
 * Instante em que a hora começa, no horário de São Paulo. O Brasil não tem horário de
 * verão desde 2019, então o fuso é sempre UTC−3 (decisão registrada na Etapa 7).
 */
export function inicioDaHora(data: string, hora: number): Date {
  return new Date(paraDataDoBanco(data).getTime() + (hora + 3) * 60 * 60 * 1000);
}

export function somarDias(data: string, dias: number): string {
  const d = paraDataDoBanco(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type ProblemaDeData = "JA_COMECOU" | "MUITO_LONGE";

export const MENSAGENS_DATA: Record<ProblemaDeData, string> = {
  JA_COMECOU: "Esse horário já começou ou já passou.",
  MUITO_LONGE: `Só dá para bloquear até ${DIAS_DE_ANTECEDENCIA} dias à frente.`,
};

/** O horário ainda não começou e está dentro da antecedência máxima. */
export function problemaDeData(
  data: string,
  horaInicio: number,
  hoje: string,
  agora: Date,
): ProblemaDeData | null {
  if (inicioDaHora(data, horaInicio) <= agora) return "JA_COMECOU";
  if (data > somarDias(hoje, DIAS_DE_ANTECEDENCIA)) return "MUITO_LONGE";
  return null;
}

/** As datas do dia da semana entre início e fim (inclusive). */
export function datasDaSerie(dataInicio: string, dataFim: string, diaSemana: number): string[] {
  if (!dataValida(dataInicio) || !dataValida(dataFim) || dataFim < dataInicio) return [];
  const datas: string[] = [];
  let data = somarDias(dataInicio, (diaSemana - diaDaSemana(dataInicio) + 7) % 7);
  while (data <= dataFim) {
    datas.push(data);
    data = somarDias(data, 7);
  }
  return datas;
}

export function descreverHorario(data: string, horaInicio: number, horaFim: number): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes} das ${horaInicio}h às ${horaFim}h`;
}

export const formatarData = (data: string) => data.split("-").reverse().slice(0, 2).join("/");

/**
 * Uma turma vista pela agenda: dá aula do dia de início até o dia anterior ao
 * encerramento (`ate`, exclusivo; null enquanto ativa).
 */
export type TurmaNaAgenda = {
  id: string;
  nome: string;
  desde: string;
  ate: string | null;
  horarios: readonly Horario[];
};

export type AulaDoDia = { turmaId: string; nome: string; inicio: number; fim: number };

/** FOCO-CA-05: as aulas de um dia, em minutos, pela ordem de início. */
export function aulasDoDia(turmas: readonly TurmaNaAgenda[], data: string): AulaDoDia[] {
  const dia = diaDaSemana(data);
  return turmas
    .filter((t) => t.desde <= data && (t.ate === null || data < t.ate))
    .flatMap((t) =>
      t.horarios
        .filter((h) => h.diaSemana === dia)
        .map((h) => ({ turmaId: t.id, nome: t.nome, inicio: h.inicio, fim: h.fim })),
    )
    .sort((a, b) => a.inicio - b.inicio);
}

/** FOCO-CA-06: datas em que o bloqueio (horas inteiras) cai sobre alguma aula. */
export function datasComAula(
  datas: readonly string[],
  horaInicio: number,
  horaFim: number,
  turmas: readonly TurmaNaAgenda[],
): string[] {
  return datas.filter((data) =>
    aulasDoDia(turmas, data).some((a) => a.inicio < horaFim * 60 && horaInicio * 60 < a.fim),
  );
}

type BloqueioNaAgenda = { data: string; horaInicio: number; horaFim: number };

/** FOCO-CA-06: datas de bloqueios que caem sobre os horários de uma turma. */
export function datasDeBloqueioSobreHorarios(
  horarios: readonly Horario[],
  bloqueios: readonly BloqueioNaAgenda[],
): string[] {
  const datas = bloqueios
    .filter((b) =>
      horarios.some((h) =>
        horariosSobrepostos(h, {
          diaSemana: diaDaSemana(b.data),
          inicio: b.horaInicio * 60,
          fim: b.horaFim * 60,
        }),
      ),
    )
    .map((b) => b.data);
  return [...new Set(datas)].sort();
}
