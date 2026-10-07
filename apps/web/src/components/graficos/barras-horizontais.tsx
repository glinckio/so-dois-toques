import { formatarReais } from "@/lib/mensalidades/formatacao";

/**
 * VIS-CA-06: participação de cada item no total, em barras horizontais de uma cor
 * só. O nome e o valor ficam escritos ao lado de cada barra.
 */
export function BarrasHorizontais({
  rotulo,
  linhas,
  cor = "serie-1",
}: {
  rotulo: string;
  linhas: readonly (readonly [string, number])[];
  cor?: "serie-1" | "serie-2";
}) {
  const maximo = Math.max(0, ...linhas.map(([, valor]) => valor));
  const classe = cor === "serie-1" ? "fill-serie-1" : "fill-serie-2";
  return (
    <ul className="flex flex-col gap-3" aria-label={rotulo} data-testid={`barras-${rotulo}`}>
      {linhas.map(([nome, valor]) => {
        const proporcao = maximo > 0 ? Math.max(0, valor) / maximo : 0;
        return (
          <li key={nome} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-suave">{nome}</span>
              <span className="font-medium tabular-nums">{formatarReais(valor)}</span>
            </div>
            <svg aria-hidden className="h-2.5 w-full" preserveAspectRatio="none">
              <rect width="100%" height="100%" rx={5} className="fill-elevado" />
              {proporcao > 0 && (
                <rect width={`${proporcao * 100}%`} height="100%" rx={5} className={classe}>
                  <title>{`${nome}: ${formatarReais(valor)}`}</title>
                </rect>
              )}
            </svg>
          </li>
        );
      })}
    </ul>
  );
}

/** Barra de progresso (0 a 1) desenhada em SVG, sem estilo embutido (CSP). */
export function Progresso({ fracao, rotulo }: { fracao: number; rotulo: string }) {
  const f = Math.min(1, Math.max(0, fracao));
  return (
    <svg
      role="img"
      aria-label={rotulo}
      className="h-2.5 w-full"
      preserveAspectRatio="none"
      data-testid="progresso"
    >
      <rect width="100%" height="100%" rx={5} className="fill-elevado" />
      {f > 0 && <rect width={`${f * 100}%`} height="100%" rx={5} className="fill-ouro" />}
    </svg>
  );
}
