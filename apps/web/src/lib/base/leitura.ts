import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import { variacao } from "@/lib/painel/inicio";

type Mes = { competencia: string; recebido: number; estornos: number; resultado: number };

export type DadosDaLeitura = {
  comparativo: readonly Mes[];
  recebido: number;
  estornos: number;
  resultado: number;
  aReceberCentavos: number;
  mensalidadesVencidas: number;
};

function mesSemAno(competencia: string): string {
  return nomeDoMes(competencia).split(" de ")[0]!.toLowerCase();
}

/** FOCO-CA-10: frases curtas que explicam o mês das mensalidades (Início). */
export function leituraDoMes(d: DadosDaLeitura): string[] {
  const frases: string[] = [];
  if (d.recebido === 0 && d.estornos === 0) {
    frases.push("Ainda não entrou nenhuma mensalidade neste mês.");
  } else {
    const anterior = d.comparativo.at(-2);
    const mudanca = anterior ? variacao(d.resultado, anterior.resultado) : null;
    if (anterior && mudanca !== null && mudanca !== 0) {
      const sentido = mudanca > 0 ? "subiu" : "caiu";
      const pct = Math.abs(mudanca).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      frases.push(`O resultado ${sentido} ${pct}% em relação a ${mesSemAno(anterior.competencia)}.`);
    } else {
      frases.push(`Já entraram ${formatarReais(d.resultado)} de mensalidades neste mês.`);
    }
  }
  if (d.estornos > 0) {
    frases.push(`Houve ${formatarReais(d.estornos)} em estornos.`);
  }
  if (d.aReceberCentavos > 0) {
    const n = d.mensalidadesVencidas;
    frases.push(
      `Há ${formatarReais(d.aReceberCentavos)} a receber, com ${n} ${n === 1 ? "mensalidade vencida" : "mensalidades vencidas"}.`,
    );
  }
  return frases;
}
