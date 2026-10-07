import { dataValida, diaDaSemana, paraDataDoBanco } from "../aulas/regras.js";

export const DURACAO_MAXIMA = 4;
export const DIAS_DE_ANTECEDENCIA = 180;
export const OCORRENCIAS_MAXIMAS = 26;
export const HORAS_PARA_CANCELAR = 24;
export const VALOR_HORA_MINIMO = 100;
export const VALOR_HORA_MAXIMO = 200_000;

export type Faixa = {
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  valorHoraCentavos: number;
};

type Intervalo = Pick<Faixa, "diaSemana" | "horaInicio" | "horaFim">;

const sobrepostas = (a: Intervalo, b: Intervalo) =>
  a.diaSemana === b.diaSemana && a.horaInicio < b.horaFim && b.horaInicio < a.horaFim;

/** HOR-CA-01: faixas novas que batem com as existentes ou entre si. */
export function conflitosDeFaixa(novas: readonly Intervalo[], existentes: readonly Intervalo[]) {
  const internas = novas.some((a, i) => novas.slice(i + 1).some((b) => sobrepostas(a, b)));
  return {
    internas,
    existentes: existentes.filter((e) => novas.some((n) => sobrepostas(n, e))),
  };
}

/**
 * HOR-CA-03: soma o preço de cada hora pela faixa em que ela cai. Devolve null se
 * alguma hora não está em faixa nenhuma (fora do funcionamento).
 */
export function valorDaReserva(
  faixasDoDia: readonly Faixa[],
  horaInicio: number,
  horaFim: number,
): number | null {
  let total = 0;
  for (let hora = horaInicio; hora < horaFim; hora++) {
    const faixa = faixasDoDia.find((f) => f.horaInicio <= hora && hora < f.horaFim);
    if (!faixa) return null;
    total += faixa.valorHoraCentavos;
  }
  return total;
}

/**
 * Instante em que a hora começa, no horário de São Paulo. O Brasil não tem horário de
 * verão desde 2019, então o fuso é sempre UTC−3 (decisão registrada na spec).
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
  MUITO_LONGE: `Só dá para reservar até ${DIAS_DE_ANTECEDENCIA} dias à frente.`,
};

/** HOR-CA-03: o horário ainda não começou e está dentro da antecedência máxima. */
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

/** HOR-CA-05: as datas do dia da semana entre início e fim (inclusive). */
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

export type ProblemaDeCancelamento = "JA_COMECOU" | "SO_ADMIN";

/** HOR-CA-08: quem pode cancelar, pela antecedência. */
export function problemaDeCancelamento(
  inicio: Date,
  agora: Date,
  admin: boolean,
): ProblemaDeCancelamento | null {
  if (inicio <= agora) return "JA_COMECOU";
  if (!admin && inicio.getTime() - agora.getTime() < HORAS_PARA_CANCELAR * 60 * 60 * 1000) {
    return "SO_ADMIN";
  }
  return null;
}

export function descreverHorario(data: string, horaInicio: number, horaFim: number): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes} das ${horaInicio}h às ${horaFim}h`;
}
