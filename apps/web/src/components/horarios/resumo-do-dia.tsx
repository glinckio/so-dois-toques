import { Anel } from "@/components/base/anel";
import type { Agenda, SituacaoDoHorario } from "@/lib/horarios/agenda";
import { ROTULOS_DA_SITUACAO } from "@/lib/horarios/agenda";
import { AMOSTRA_DA_SITUACAO } from "./estilos";

const horas = (minutos: number) =>
  `${(minutos / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

/**
 * Resumo do dia, o destaque da agenda: quanto da quadra está ocupado (aulas e
 * bloqueios sobre as 19 horas abertas) e a legenda, com o mesmo desenho dos blocos.
 */
export function ResumoDoDia({ agenda }: { agenda: Agenda }) {
  const aulas = agenda.blocos.filter((b) => b.tipo === "aula").length;
  const bloqueios = agenda.blocos.length - aulas;
  const ordem: (SituacaoDoHorario | "livre")[] = ["aula", "bloqueio", "livre"];
  const legenda: Record<SituacaoDoHorario | "livre", string> = {
    aula: horas(agenda.minutosDeAula),
    bloqueio: horas(agenda.minutosBloqueados),
    livre: `${agenda.livres.length} h`,
  };
  return (
    <section
      aria-labelledby="titulo-resumo-do-dia"
      className="superficie-destaque relative flex flex-col justify-center gap-4 overflow-hidden rounded-[1.75rem] p-5 sm:p-6"
    >
      <span
        aria-hidden="true"
        className="bg-areia/15 absolute -top-20 -right-16 size-52 rounded-full blur-3xl"
      />
      <div className="relative flex items-center gap-4 sm:gap-5">
        <Anel
          fracao={agenda.ocupacao}
          tom="areia"
          tamanho={92}
          espessura={9}
          rotulo={`Quadra ocupada em ${Math.round(agenda.ocupacao * 100)}% do dia`}
        >
          <span className="text-lg font-extrabold tabular-nums">
            {Math.round(agenda.ocupacao * 100)}%
          </span>
        </Anel>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="titulo-resumo-do-dia"
            className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase"
          >
            Resumo do dia
          </h2>
          <p className="text-suave text-sm">
            <span className="text-texto text-3xl font-extrabold tabular-nums">{aulas}</span>{" "}
            {aulas === 1 ? "aula" : "aulas"}
          </p>
          <p className="text-apagado text-xs">
            {bloqueios} {bloqueios === 1 ? "bloqueio" : "bloqueios"} · {agenda.livres.length}{" "}
            {agenda.livres.length === 1 ? "hora livre" : "horas livres"}
          </p>
        </div>
      </div>
      <ul
        id="legenda-da-grade"
        aria-label="Legenda da agenda"
        className="relative flex flex-wrap gap-1.5"
      >
        {ordem.map((situacao) => (
          <li
            key={situacao}
            className="bg-noite/35 flex min-h-8 items-center gap-1.5 rounded-full border border-white/5 py-1 pr-3 pl-1.5 text-xs"
          >
            <span
              aria-hidden="true"
              className={`size-5 shrink-0 rounded-full border ${AMOSTRA_DA_SITUACAO[situacao]}`}
            />
            <span className="font-semibold">{ROTULOS_DA_SITUACAO[situacao]}</span>
            {legenda[situacao] && (
              <span className="text-apagado tabular-nums">{legenda[situacao]}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
