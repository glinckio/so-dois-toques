import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import { variacao } from "@/lib/painel/inicio";

type Mes = { competencia: string; receitas: number; despesas: number; resultado: number };

export type DadosDaLeitura = {
  comparativo: readonly Mes[];
  receitas: Record<string, number>;
  nomesDasOrigens: Record<string, string>;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  aReceberCentavos: number;
  mensalidadesVencidas: number;
};

function mesSemAno(competencia: string): string {
  return nomeDoMes(competencia).split(" de ")[0]!.toLowerCase();
}

/** Frases curtas que explicam o mês, calculadas dos números do Contábil (Início). */
export function leituraDoMes(d: DadosDaLeitura): string[] {
  const frases: string[] = [];
  if (d.totalReceitas === 0 && d.totalDespesas === 0) {
    frases.push("Ainda não há receitas nem despesas lançadas neste mês.");
  } else if (d.resultado < 0) {
    frases.push(`As despesas passaram as receitas em ${formatarReais(-d.resultado)} até agora.`);
  } else {
    const anterior = d.comparativo.at(-2);
    const mudanca = anterior ? variacao(d.resultado, anterior.resultado) : null;
    if (anterior && mudanca !== null && mudanca !== 0) {
      const sentido = mudanca > 0 ? "subiu" : "caiu";
      const pct = Math.abs(mudanca).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      frases.push(
        `O resultado ${sentido} ${pct}% em relação a ${mesSemAno(anterior.competencia)}.`,
      );
    } else {
      frases.push(`O resultado do mês está em ${formatarReais(d.resultado)}.`);
    }
  }
  const maior = Object.entries(d.receitas).sort((a, b) => b[1] - a[1])[0];
  if (d.totalReceitas > 0 && maior) {
    const [chave, valor] = maior;
    const pct = Math.round((valor / d.totalReceitas) * 100);
    const nome = d.nomesDasOrigens[chave] ?? chave;
    frases.push(`${nome} responde${pct === 100 ? " por toda" : ` por ${pct}% da`} receita.`);
  }
  if (d.aReceberCentavos > 0) {
    const n = d.mensalidadesVencidas;
    frases.push(
      n > 0
        ? `Há ${formatarReais(d.aReceberCentavos)} a receber, com ${n} ${n === 1 ? "mensalidade vencida" : "mensalidades vencidas"}.`
        : `Há ${formatarReais(d.aReceberCentavos)} a receber de reservas.`,
    );
  }
  return frases;
}
