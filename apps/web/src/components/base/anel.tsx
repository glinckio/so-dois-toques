import type { ReactNode } from "react";

const CORES = {
  roxo: "stroke-roxo",
  ouro: "stroke-ouro",
  sucesso: "stroke-sucesso",
  perigo: "stroke-perigo",
  areia: "stroke-areia",
} as const;

/**
 * Progresso circular que se desenha ao aparecer, com o conteúdo no meio
 * (VIVO-CA-12: o rótulo diz o mesmo para leitor de tela).
 */
export function Anel({
  fracao,
  rotulo,
  tamanho = 76,
  espessura = 8,
  tom = "roxo",
  children,
  className = "",
}: {
  fracao: number;
  rotulo: string;
  tamanho?: number;
  espessura?: number;
  tom?: keyof typeof CORES;
  children?: ReactNode;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, fracao)) * 1000) / 10;
  const raio = 50 - espessura / 2 - 1;
  return (
    <div
      role="img"
      aria-label={rotulo}
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      data-fracao={pct}
    >
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx="50" cy="50" r={raio} fill="none" strokeWidth={espessura} className="stroke-elevado" />
        {pct > 0 && (
          <circle
            cx="50"
            cy="50"
            r={raio}
            fill="none"
            strokeWidth={espessura}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 200`}
            transform="rotate(-90 50 50)"
            className={`animate-desenhar ${CORES[tom]}`}
          />
        )}
      </svg>
      {children && (
        <span className="absolute inset-0 grid place-items-center text-center leading-tight" aria-hidden="true">
          {children}
        </span>
      )}
    </div>
  );
}
