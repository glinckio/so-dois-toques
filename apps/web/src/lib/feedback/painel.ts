/** Etapa 19: o que a API devolve e as contas de tela do feedback. */

export type FormularioPublico = {
  pausado: boolean;
  turmas: { id: string; descricao: string }[];
};

export type RespostaDoPainel = {
  id: string;
  nota: number;
  comentario: string | null;
  melhoria: string | null;
  turma: string | null;
  nome: string | null;
  lida: boolean;
  criadaEm: string;
};

export type PainelFeedback = {
  periodo: { de: string; ate: string };
  pausado: boolean;
  naoLidas: number;
  resumo: { quantidade: number; media: number | null; distribuicao: number[] };
  mensal: { competencia: string; quantidade: number; media: number | null }[];
  turmas: { id: string; descricao: string; ativa: boolean }[];
  respostas: RespostaDoPainel[];
};

export const NOTAS = [1, 2, 3, 4, 5] as const;

export const ROTULOS_DAS_NOTAS: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Boa",
  5: "Ótima",
};

/** Os mesmos limites da API (FEED-CA-01), para o contador do campo. */
export const TEXTO_MAXIMO = 1000;
export const NOME_MAXIMO = 120;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Parametros = Record<string, string | string[] | undefined>;

const texto = (valor: string | string[] | undefined) =>
  typeof valor === "string" && valor !== "" ? valor : undefined;

/**
 * FEED-CA-05: filtros da tela (período, turma e nota) na consulta da API, descartando
 * valores inválidos. Sem período, a API usa os últimos 30 dias.
 */
export function filtroDoPainel(parametros: Parametros) {
  const de = texto(parametros.de);
  const ate = texto(parametros.ate);
  const turmaId = texto(parametros.turmaId);
  const nota = Number(texto(parametros.nota));
  const periodoValido = de !== undefined && ate !== undefined && DATA.test(de) && DATA.test(ate);
  const filtro = {
    de: periodoValido ? de : undefined,
    ate: periodoValido ? ate : undefined,
    turmaId: turmaId && UUID.test(turmaId) ? turmaId : undefined,
    nota: Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : undefined,
  };
  const consulta = new URLSearchParams();
  if (filtro.de && filtro.ate) {
    consulta.set("de", filtro.de);
    consulta.set("ate", filtro.ate);
  }
  if (filtro.turmaId) consulta.set("turmaId", filtro.turmaId);
  if (filtro.nota) consulta.set("nota", String(filtro.nota));
  return { filtro, consulta };
}

/** Média com uma casa e vírgula ("4,5"); sem respostas, um traço. */
export function formatarMedia(media: number | null): string {
  return media === null ? "—" : media.toFixed(1).replace(".", ",");
}

/** "1 resposta", "3 respostas". */
export function quantasRespostas(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "resposta" : "respostas"}`;
}

/** Porcentagem inteira de cada nota no total, para as barras da distribuição. */
export function partesDaDistribuicao(distribuicao: readonly number[]) {
  const total = distribuicao.reduce((soma, n) => soma + n, 0);
  return NOTAS.map((nota) => {
    const quantidade = distribuicao[nota - 1] ?? 0;
    return {
      nota,
      quantidade,
      porcentagem: total === 0 ? 0 : Math.round((quantidade / total) * 100),
    };
  }).reverse();
}
