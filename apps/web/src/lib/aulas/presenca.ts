import { deslocar, semanaDe, type DiaDaFaixa } from "@/lib/base/semana";
import { ultimaAula, type Horario } from "./formatacao";

export type Marca = "presente" | "ausente";

export type ContagemDaPresenca = {
  total: number;
  presentes: number;
  ausentes: number;
  semMarca: number;
  /** Partes do anel (0 a 1): presentes em verde num sentido, ausentes em vermelho no outro. */
  fracaoPresentes: number;
  fracaoAusentes: number;
  /** Contador da tela: "8 de 12 presentes". */
  texto: string;
  /** O mesmo do anel, por extenso, para leitor de tela (VIVO-CA-12). */
  rotulo: string;
};

/**
 * VIVO-CA-09: o contador e o anel da presença saem da mesma conta, refeita a cada
 * toque em Presente ou Ausente.
 */
export function contarPresenca(marcas: readonly (Marca | null | undefined)[]): ContagemDaPresenca {
  const total = marcas.length;
  const presentes = marcas.filter((m) => m === "presente").length;
  const ausentes = marcas.filter((m) => m === "ausente").length;
  const semMarca = total - presentes - ausentes;
  const parte = (n: number) => (total > 0 ? n / total : 0);
  return {
    total,
    presentes,
    ausentes,
    semMarca,
    fracaoPresentes: parte(presentes),
    fracaoAusentes: parte(ausentes),
    texto: `${presentes} de ${total} presentes`,
    rotulo: `Presença: ${presentes} de ${total} presentes, ${ausentes} ${ausentes === 1 ? "ausente" : "ausentes"} e ${semMarca} sem marcar`,
  };
}

export type DiaDaPresenca = DiaDaFaixa & {
  escolhido: boolean;
  hoje: boolean;
  temAula: boolean;
  /** Dá para abrir a presença: dia de aula, desde o início da turma e até hoje. */
  disponivel: boolean;
};

export type SemanaDaPresenca = {
  dias: DiaDaPresenca[];
  /** Última aula da semana anterior (ou null se for antes da turma). */
  anterior: string | null;
  /** Aula mais recente da semana seguinte, até hoje (ou null). */
  proxima: string | null;
  /** A aula mais recente até hoje, para o atalho "Última aula". */
  ultima: string | null;
};

/**
 * Faixa de dias da presença: a semana da data escolhida, com os dias de aula da
 * turma liberados e o resto apagado (sem aula, antes da turma ou no futuro).
 */
export function semanaDaPresenca(
  data: string,
  hoje: string,
  horarios: readonly Horario[],
  inicioDaTurma: string,
): SemanaDaPresenca {
  const diasDeAula = new Set(horarios.map((h) => h.diaSemana));
  const semana = semanaDe(data);
  const dias = semana.map((d) => {
    const temAula = diasDeAula.has(d.diaSemana);
    return {
      ...d,
      escolhido: d.data === data,
      hoje: d.data === hoje,
      temAula,
      disponivel: temAula && d.data <= hoje && d.data >= inicioDaTurma,
    };
  });
  const valida = (d: string | null) => (d !== null && d >= inicioDaTurma && d <= hoje ? d : null);
  const domingo = semana[0]!.data;
  const anterior = valida(ultimaAula(horarios, deslocar(domingo, -1)));
  const domingoSeguinte = deslocar(domingo, 7);
  const sabadoSeguinte = deslocar(domingo, 13);
  const limite = sabadoSeguinte < hoje ? sabadoSeguinte : hoje;
  const candidata = limite >= domingoSeguinte ? ultimaAula(horarios, limite) : null;
  const proxima = candidata !== null && candidata >= domingoSeguinte ? valida(candidata) : null;
  return { dias, anterior, proxima, ultima: valida(ultimaAula(horarios, hoje)) };
}
