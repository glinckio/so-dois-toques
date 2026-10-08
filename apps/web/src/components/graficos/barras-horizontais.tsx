import { formatarReais } from "@/lib/mensalidades/formatacao";

const CORES = {
  "serie-1": "fill-serie-1",
  "serie-2": "fill-serie-2",
} as const;

/**
 * VIS-CA-06: participação de cada item no total, em barras arredondadas de uma cor
 * só que crescem uma depois da outra. É uma tabela: nome, valor e percentual ficam
 * escritos, e a barra embaixo do nome é só o desenho.
 */
export function BarrasHorizontais({
  rotulo,
  linhas,
  cor = "serie-1",
  testId,
}: {
  rotulo: string;
  linhas: readonly (readonly [string, number])[];
  cor?: keyof typeof CORES;
  testId?: string;
}) {
  const maximo = Math.max(0, ...linhas.map(([, valor]) => valor));
  const total = linhas.reduce((t, [, valor]) => t + Math.max(0, valor), 0);
  return (
    <table
      className="w-full border-separate border-spacing-y-2 text-sm"
      aria-label={rotulo}
      data-testid={testId}
    >
      <tbody>
        {linhas.map(([nome, valor], i) => {
          const proporcao = maximo > 0 ? Math.max(0, valor) / maximo : 0;
          return (
            <tr key={nome}>
              <th scope="row" className="w-full pr-3 text-left font-normal">
                <span className="text-suave block pb-1.5">{nome}</span>
                <svg aria-hidden="true" className="block h-2.5 w-full" preserveAspectRatio="none">
                  <rect width="100%" height="100%" rx={5} className="fill-elevado" />
                  {proporcao > 0 && (
                    <rect
                      width={`${proporcao * 100}%`}
                      height="100%"
                      rx={5}
                      className={`animate-crescer-x origem-esquerda atraso-${i * 3} ${CORES[cor]}`}
                    />
                  )}
                </svg>
              </th>
              <td className="pr-2 text-right align-bottom font-semibold whitespace-nowrap tabular-nums">
                {formatarReais(valor)}
              </td>
              <td className="text-apagado w-11 text-right align-bottom text-xs tabular-nums">
                {total > 0 ? `${Math.round((Math.max(0, valor) / total) * 100)}%` : "—"}
              </td>
            </tr>
          );
        })}
        <tr>
          <th scope="row" className="border-borda border-t pt-2.5 text-left font-semibold">
            Total
          </th>
          <td className="border-borda border-t pt-2.5 pr-2 text-right font-bold whitespace-nowrap tabular-nums">
            {formatarReais(total)}
          </td>
          <td className="border-borda border-t pt-2.5" />
        </tr>
      </tbody>
    </table>
  );
}
