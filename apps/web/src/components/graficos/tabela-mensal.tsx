import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";

type Mes = { competencia: string; receitas: number; despesas: number; resultado: number };

const numero = "text-right tabular-nums";

/** Os valores do gráfico mensal em tabela (CONT-CA-04, VIS-CA-04). */
export function TabelaMensal({ meses }: { meses: readonly Mes[] }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5"
        aria-label="Comparativo mensal"
      >
        <thead>
          <tr className="text-left">
            <th scope="col">Mês</th>
            <th scope="col" className={numero}>
              Receitas
            </th>
            <th scope="col" className={numero}>
              Despesas
            </th>
            <th scope="col" className={numero}>
              Resultado
            </th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.competencia} className="border-borda border-t">
              <th scope="row" className="text-left font-normal">
                {nomeDoMes(m.competencia)}
              </th>
              <td className={numero}>{formatarReais(m.receitas)}</td>
              <td className={numero}>{formatarReais(m.despesas)}</td>
              <td className={`${numero} ${m.resultado < 0 ? "text-perigo" : ""}`}>
                {formatarReais(m.resultado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
