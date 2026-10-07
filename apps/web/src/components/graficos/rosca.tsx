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
 * Rosca que se desenha fatia por fatia, com o total no meio e a legenda com nome,
 * valor e percentual de cada parte (VIVO-CA-12: o rótulo diz o mesmo em texto).
 */
export function Rosca({
  rotulo,
  partes,
  centro,
  tamanho = 176,
  lado = false,
}: {
  rotulo: string;
  partes: readonly { nome: string; valor: number }[];
  centro: ReactNode;
  tamanho?: number;
  /** Legenda ao lado da rosca (cartões largos); senão, embaixo. */
  lado?: boolean;
}) {
  const fatias = fatiasDaRosca(partes.map((p) => p.valor));
  const total = partes.reduce((t, p) => t + Math.max(0, p.valor), 0);
  const percentual = (i: number) => Math.round(fatias[i]?.percentual ?? 0);
  const descricao =
    total > 0
      ? `${rotulo}: ${partes.map((p, i) => `${p.nome}, ${percentual(i)}%`).join("; ")}.`
      : `${rotulo}: nada lançado ainda.`;
  return (
    <div className={`flex flex-col items-center gap-5 ${lado ? "sm:flex-row" : ""}`}>
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
      <ul className="flex w-full flex-col gap-1">
        {partes.map((p, i) => (
          <li
            key={p.nome}
            className="hover:bg-elevado/50 flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors"
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${CORES[i % CORES.length]!.ponto}`}
            />
            <span className="text-suave min-w-0 flex-1 truncate">{p.nome}</span>
            <span className="font-semibold tabular-nums">{formatarReais(p.valor)}</span>
            <span className="text-apagado w-10 text-right text-xs tabular-nums">
              {total > 0 ? `${percentual(i)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
