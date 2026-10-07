const CORES = {
  roxo: "fill-roxo",
  ouro: "fill-ouro",
  sucesso: "fill-sucesso",
  perigo: "fill-perigo",
  areia: "fill-areia",
} as const;

/**
 * Barra arredondada que cresce da esquerda. A marca opcional mostra um limite
 * (por exemplo o estoque mínimo). O rótulo descreve o mesmo em texto (VIVO-CA-12).
 */
export function BarraNivel({
  fracao,
  rotulo,
  marca,
  tom = "roxo",
  altura = "h-2.5",
}: {
  fracao: number;
  rotulo: string;
  marca?: number;
  tom?: keyof typeof CORES;
  altura?: string;
}) {
  const f = Math.min(1, Math.max(0, fracao));
  return (
    <svg
      role="img"
      aria-label={rotulo}
      className={`w-full overflow-visible ${altura}`}
      preserveAspectRatio="none"
    >
      <rect width="100%" height="100%" rx="5" className="fill-elevado" />
      {f > 0 && (
        <rect
          width={`${f * 100}%`}
          height="100%"
          rx="5"
          className={`animate-crescer-x origem-esquerda ${CORES[tom]}`}
        />
      )}
      {marca !== undefined && marca > 0 && marca < 1 && (
        <rect x={`${marca * 100}%`} y="-40%" width="2" height="180%" rx="1" className="fill-texto/70" />
      )}
    </svg>
  );
}
