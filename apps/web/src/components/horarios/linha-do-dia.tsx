import { formatarReais } from "@/lib/mensalidades/formatacao";
import { nivelDoPreco, type NivelDoPreco } from "@/lib/horarios/precos";
import type { Faixa } from "@/lib/horarios/tipos";

/** Cor de cada nível de preço: areia (mais barato), ouro e roxo (horário nobre). */
export const COR_DO_NIVEL: Record<NivelDoPreco, string> = {
  0: "bg-linear-to-r from-[#f4dfba] to-areia text-fundo",
  1: "bg-linear-to-r from-[#f5bd1f] to-ouro text-fundo",
  2: "bg-linear-to-r from-[#8448f0] to-[#6d28d9] text-white shadow-[0_0_16px_-6px_rgb(124_58_237_/_0.9)]",
};

const MARCAS = [0, 6, 12, 18] as const;

/** Régua das horas do dia (0h, 6h, 12h, 18h e 24h), alinhada com as linhas do dia. */
export function ReguaDoDia() {
  return (
    <div aria-hidden="true" className="grid grid-cols-24">
      {MARCAS.map((h) => (
        <span
          key={h}
          className={`text-apagado col-start-${h + 1} row-start-1 text-[0.65rem] font-semibold tabular-nums ${h === 0 ? "" : "-translate-x-1/2"}`}
        >
          {h}h
        </span>
      ))}
      <span className="text-apagado col-start-24 row-start-1 justify-self-end text-[0.65rem] font-semibold tabular-nums">
        24h
      </span>
    </div>
  );
}

/**
 * As faixas de preço de um dia como faixas na linha das 24 horas: cada faixa ocupa as
 * suas horas e mostra o preço da hora; a cor sobe com o preço. É desenho: o mesmo
 * conteúdo aparece em texto logo abaixo, na lista.
 */
export function LinhaDoDia({
  faixas,
  todosOsPrecos,
  atraso,
}: {
  faixas: readonly Pick<Faixa, "id" | "horaInicio" | "horaFim" | "valorHoraCentavos">[];
  todosOsPrecos: readonly number[];
  atraso: number;
}) {
  if (faixas.length === 0) {
    return (
      <div className="border-borda text-apagado flex h-9 items-center justify-center rounded-full border border-dashed bg-[repeating-linear-gradient(135deg,rgb(157_150_187_/_0.08)_0_6px,transparent_6px_12px)] text-xs font-semibold">
        Fechado
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="bg-elevado/50 grid h-9 grid-cols-24 rounded-full ring-1 ring-white/5"
    >
      {faixas.map((f, i) => (
        <span
          key={f.id}
          className={`col-start-${f.horaInicio + 1} col-span-${f.horaFim - f.horaInicio} animate-crescer-x row-start-1 m-0.5 flex origin-left items-center justify-center overflow-hidden rounded-full text-[0.7rem] font-bold whitespace-nowrap tabular-nums atraso-${Math.min(24, atraso + i)} ${COR_DO_NIVEL[nivelDoPreco(f.valorHoraCentavos, todosOsPrecos)]}`}
        >
          {f.horaFim - f.horaInicio >= 3 && formatarReais(f.valorHoraCentavos).replace(/,00$/, "")}
        </span>
      ))}
    </div>
  );
}
