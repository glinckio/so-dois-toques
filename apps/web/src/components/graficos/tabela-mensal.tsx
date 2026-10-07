import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";

type Mes = { competencia: string; receitas: number; despesas: number; resultado: number };

const numero = "pl-4 text-right whitespace-nowrap tabular-nums";

/** Os valores do gráfico mensal em tabela (CONT-CA-04, VIS-CA-04). */
export function TabelaMensal({ meses }: { meses: readonly Mes[] }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-sm [&_td]:py-2 [&_th]:py-2"
        aria-label="Comparativo mensal"
      >
        <thead>
          <tr className="text-apagado text-left text-xs font-bold tracking-wide uppercase">
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
              <th scope="row" className="text-suave text-left font-normal whitespace-nowrap">
                {nomeDoMes(m.competencia)}
              </th>
              <td className={numero}>{formatarReais(m.receitas)}</td>
              <td className={numero}>{formatarReais(m.despesas)}</td>
              <td className={`${numero} font-semibold ${m.resultado < 0 ? "text-perigo" : ""}`}>
                {formatarReais(m.resultado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
