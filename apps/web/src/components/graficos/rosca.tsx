import type { ReactNode } from "react";
import { fatiasDaRosca } from "@/lib/base/rosca";
import { formatarReais } from "@/lib/mensalidades/formatacao";

/** Cores das fatias, na ordem fixa das origens (conferidas para daltonismo no fundo escuro). */
const CORES = [
  { traco: "stroke-serie-1", ponto: "bg-serie-1" },
  { traco: "stroke-serie-2", ponto: "bg-serie-2" },
  { traco: "stroke-serie-3", ponto: "bg-serie-3" },
  { traco: "stroke-serie-4", ponto: "bg-serie-4" },
] as const;

/**
 * Rosca que se desenha fatia por fatia, com o total no meio. A legenda é uma tabela
 * com nome, valor e percentual de cada parte (VIVO-CA-12: o texto equivalente).
 */
export function Rosca({
  rotulo,
  partes,
  centro,
  tamanho = 176,
  lado = false,
  comTotal = false,
  testId,
}: {
  rotulo: string;
  partes: readonly { nome: string; valor: number }[];
  centro: ReactNode;
  tamanho?: number;
  /** Legenda ao lado da rosca (cartões largos); senão, embaixo. */
  lado?: boolean;
  /** Linha de total no fim da tabela da legenda. */
  comTotal?: boolean;
  testId?: string;
}) {
  const fatias = fatiasDaRosca(partes.map((p) => p.valor));
  const total = partes.reduce((t, p) => t + Math.max(0, p.valor), 0);
  const percentual = (i: number) => Math.round(fatias[i]?.percentual ?? 0);
  const descricao =
    total > 0
      ? `${rotulo}: ${partes.map((p, i) => `${p.nome}, ${percentual(i)}%`).join("; ")}.`
      : `${rotulo}: nada lançado ainda.`;
  return (
    <div
      className={`flex flex-col items-center gap-5 ${lado ? "sm:flex-row sm:gap-8" : ""}`}
      data-testid={testId}
    >
      <div role="img" aria-label={descricao} className="relative grid shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="11" className="stroke-elevado" />
          {fatias.map((f, i) =>
            f.tamanho > 0 ? (
              <circle
                key={partes[i]!.nome}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                strokeWidth="11"
                pathLength={100}
                strokeDasharray={`${f.tamanho} 200`}
                transform={`rotate(${-90 + f.inicio * 3.6} 50 50)`}
                className={`animate-desenhar atraso-${i * 4} ${CORES[i % CORES.length]!.traco}`}
              />
            ) : null,
          )}
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
          {centro}
        </span>
      </div>
      <table className="w-full border-separate border-spacing-y-1 text-sm" aria-label={rotulo}>
        <tbody>
          {partes.map((p, i) => (
            <tr key={p.nome}>
              <th scope="row" className="py-1 pr-2 text-left font-normal">
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${CORES[i % CORES.length]!.ponto}`}
                  />
                  <span className="text-suave">{p.nome}</span>
                </span>
              </th>
              <td className="py-1 text-right font-semibold whitespace-nowrap tabular-nums">
                {formatarReais(p.valor)}
              </td>
              <td className="text-apagado w-12 py-1 text-right text-xs tabular-nums">
                {total > 0 ? `${percentual(i)}%` : "—"}
              </td>
            </tr>
          ))}
          {comTotal && (
            <tr>
              <th scope="row" className="border-borda border-t pt-2 text-left font-semibold">
                Total
              </th>
              <td className="border-borda border-t pt-2 text-right font-bold whitespace-nowrap tabular-nums">
                {formatarReais(total)}
              </td>
              <td className="border-borda border-t pt-2" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
