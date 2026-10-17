export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const TEXTO_MAXIMO = 1000;
export const NOME_MAXIMO = 120;

/** FEED-CA-03: envios aceitos do mesmo IP dentro de uma hora. */
export const ENVIOS_POR_HORA = 5;
export const JANELA_ENVIOS_MS = 60 * 60 * 1000;

export function limiteAtingido(enviosNaJanela: number): boolean {
  return enviosNaJanela >= ENVIOS_POR_HORA;
}

// Caracteres de controle (menos quebra de linha e tabulação) não têm uso num comentário.
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Texto livre opcional: sem caracteres de controle e espaços nas pontas; vazio vira `null`. */
export function textoOpcional(texto: string | null | undefined): string | null {
  const limpo = (texto ?? "").replace(CONTROLE, "").replace(/\r\n?/g, "\n").trim();
  return limpo === "" ? null : limpo;
}

export type ResumoDasNotas = {
  quantidade: number;
  /** Média com uma casa decimal; `null` sem respostas. */
  media: number | null;
  /** Quantas respostas com nota 1, 2, 3, 4 e 5 (nesta ordem). */
  distribuicao: [number, number, number, number, number];
};

/** FEED-CA-05 */
export function resumoDasNotas(notas: readonly number[]): ResumoDasNotas {
  const distribuicao: ResumoDasNotas["distribuicao"] = [0, 0, 0, 0, 0];
  let soma = 0;
  for (const nota of notas) {
    distribuicao[nota - NOTA_MINIMA]! += 1;
    soma += nota;
  }
  return {
    quantidade: notas.length,
    media: notas.length === 0 ? null : Math.round((soma / notas.length) * 10) / 10,
    distribuicao,
  };
}

const MES_EM_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
});

/** Mês (AAAA-MM) da data no fuso de São Paulo. */
export function mesEmSaoPaulo(data: Date): string {
  return MES_EM_SP.format(data).slice(0, 7);
}

/** FEED-CA-05: média e quantidade de cada mês pedido, na ordem dos meses. */
export function mediasMensais(
  respostas: readonly { nota: number; criadaEm: Date }[],
  meses: readonly string[],
): { competencia: string; quantidade: number; media: number | null }[] {
  const porMes = new Map<string, number[]>(meses.map((m) => [m, []]));
  for (const r of respostas) porMes.get(mesEmSaoPaulo(r.criadaEm))?.push(r.nota);
  return meses.map((competencia) => {
    const { quantidade, media } = resumoDasNotas(porMes.get(competencia)!);
    return { competencia, quantidade, media };
  });
}
