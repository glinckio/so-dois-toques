import { Icone } from "@/components/icones";
import { DIAS_CURTOS, gruposDeHorarios, type Horario } from "@/lib/aulas/formatacao";

/** Horários da turma em pílulas: os dias em negrito e a faixa de horas ao lado. */
export function PilulasDeHorario({
  horarios,
  destaqueDia,
}: {
  horarios: readonly Horario[];
  /** Dia da semana de hoje: a pílula que tem aula hoje ganha o ponto dourado. */
  destaqueDia?: number;
}) {
  const grupos = gruposDeHorarios(horarios);
  if (grupos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {grupos.map((g) => {
        const hoje = destaqueDia !== undefined && g.diasSemana.includes(destaqueDia);
        return (
          <li
            key={`${g.dias}-${g.faixa}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap ${
              hoje ? "border-ouro/35 bg-ouro/8" : "border-borda bg-elevado/50"
            }`}
          >
            <Icone
              nome="relogio"
              width={12}
              height={12}
              className={hoje ? "text-ouro" : "text-apagado"}
            />
            <span className="font-bold">{g.dias}</span>
            <span className="text-suave tabular-nums">{g.faixa}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A semana da turma em sete bolinhas: os dias de aula acesos em roxo e hoje com o
 * anel dourado. É só desenho; os horários por escrito ficam nas pílulas.
 */
export function SemanaDaTurma({ horarios, hoje }: { horarios: readonly Horario[]; hoje?: number }) {
  const dias = new Set(horarios.map((h) => h.diaSemana));
  return (
    <ol className="flex gap-1.5" aria-hidden="true">
      {DIAS_CURTOS.map((nome, dia) => (
        <li
          key={nome}
          className={`grid size-8 place-items-center rounded-full text-[0.68rem] font-bold ${
            dias.has(dia)
              ? "bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_6px_16px_-8px_rgb(124_58_237_/_0.9)]"
              : "bg-elevado/60 text-apagado"
          } ${hoje === dia ? "ring-ouro ring-offset-cartao ring-2 ring-offset-2" : ""}`}
        >
          {nome.charAt(0)}
        </li>
      ))}
    </ol>
  );
}
