import type { ContagemDaPresenca } from "@/lib/aulas/presenca";

/**
 * VIVO-CA-09: anel da presença. Os presentes crescem em verde no sentido do relógio
 * e os ausentes em vermelho no sentido contrário; o que sobra no meio é quem ainda
 * não foi marcado. A cada toque o traço corre até o novo valor (transição do
 * `stroke-dasharray`, que "reduzir movimento" desliga). O rótulo diz o mesmo.
 */
export function AnelDaPresenca({
  contagem,
  tamanho = 128,
}: {
  contagem: ContagemDaPresenca;
  tamanho?: number;
}) {
  const presentes = Math.round(contagem.fracaoPresentes * 1000) / 10;
  const ausentes = Math.round(contagem.fracaoAusentes * 1000) / 10;
  const traco = "transition-[stroke-dasharray,opacity] duration-500 ease-mola";
  return (
    <div
      role="img"
      aria-label={contagem.rotulo}
      data-testid="anel-presenca"
      data-presentes={contagem.presentes}
      data-ausentes={contagem.ausentes}
      className="relative inline-grid shrink-0 place-items-center"
    >
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="9" className="stroke-elevado" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${ausentes} 200`}
          transform="matrix(0 -1 -1 0 100 100)"
          className={`stroke-perigo ${traco} ${ausentes > 0 ? "opacity-100" : "opacity-0"}`}
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${presentes} 200`}
          transform="rotate(-90 50 50)"
          className={`stroke-sucesso animate-desenhar ${traco} ${presentes > 0 ? "opacity-100" : "opacity-0"}`}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center text-center leading-none"
      >
        <span className="flex flex-col items-center gap-1">
          <span className="text-4xl font-extrabold tabular-nums">
            {contagem.presentes}
            <span className="text-apagado text-lg font-bold">/{contagem.total}</span>
          </span>
          <span className="text-apagado text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            presentes
          </span>
        </span>
      </span>
    </div>
  );
}
