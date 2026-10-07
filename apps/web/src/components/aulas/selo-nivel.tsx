import { NIVEIS, type Nivel } from "@/lib/aulas/formatacao";
import { DEGRAUS_DO_NIVEL } from "@/lib/aulas/visual";

/** Cor própria de cada nível (fora das cores de situação: verde, vermelho e dourado de "a pagar"). */
const CORES: Record<Nivel, { selo: string; barra: string }> = {
  INICIANTE: { selo: "bg-sky-400/12 text-sky-300 ring-sky-400/25", barra: "bg-sky-300" },
  INTERMEDIARIO: { selo: "bg-ouro/12 text-ouro ring-ouro/25", barra: "bg-ouro" },
  AVANCADO: { selo: "bg-pink-400/12 text-pink-300 ring-pink-400/25", barra: "bg-pink-300" },
};

const ALTURAS = ["h-1.5", "h-2.5", "h-3.5"] as const;

/** Sinal de barras do nível: uma, duas ou três acesas (o nível nunca é só a cor). */
export function SinalDoNivel({ nivel }: { nivel: Nivel }) {
  const degraus = DEGRAUS_DO_NIVEL[nivel];
  return (
    <span className="flex items-end gap-0.5" aria-hidden="true">
      {ALTURAS.map((altura, i) => (
        <span
          key={altura}
          className={`w-1 rounded-full ${altura} ${i < degraus ? CORES[nivel].barra : "bg-current opacity-25"}`}
        />
      ))}
    </span>
  );
}

/** Selo do nível da turma: sinal de barras e o nome, na cor do nível. */
export function SeloNivel({ nivel, className = "" }: { nivel: Nivel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ${CORES[nivel].selo} ${className}`}
    >
      <SinalDoNivel nivel={nivel} />
      {NIVEIS[nivel]}
    </span>
  );
}
