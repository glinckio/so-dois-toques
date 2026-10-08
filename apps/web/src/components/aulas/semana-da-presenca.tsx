import Link from "next/link";
import { Icone } from "@/components/icones";
import { DIAS_CURTOS, DIAS_SEMANA, type Horario } from "@/lib/aulas/formatacao";
import { semanaDaPresenca } from "@/lib/aulas/presenca";
import { nomeDoMes } from "@/lib/mensalidades/formatacao";

/**
 * Faixa de dias da presença: a semana da aula escolhida, no mesmo desenho da faixa
 * de dias do sistema, mas só os dias de aula da turma (do início dela até hoje)
 * podem ser abertos. As setas pulam para a aula da semana vizinha.
 */
export function SemanaDaPresenca({
  caminho,
  data,
  hoje,
  horarios,
  inicioDaTurma,
}: {
  /** Página da presença, que recebe `?data=`. */
  caminho: string;
  data: string;
  hoje: string;
  horarios: readonly Horario[];
  inicioDaTurma: string;
}) {
  const { dias, anterior, proxima, ultima } = semanaDaPresenca(data, hoje, horarios, inicioDaTurma);
  const href = (d: string) => `${caminho}?data=${d}`;
  const seta =
    "grid size-11 shrink-0 place-items-center rounded-full border border-borda bg-elevado/60 text-suave transition hover:border-roxo/50 hover:text-texto";
  return (
    <nav
      aria-label="Escolher o dia da aula"
      className="superficie flex flex-col gap-3 rounded-[1.75rem] p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="font-bold first-letter:uppercase">{nomeDoMes(data.slice(0, 7))}</p>
        <div className="flex items-center gap-2">
          {ultima && ultima !== data && (
            <Link
              href={href(ultima)}
              className="text-ouro hover:bg-ouro/10 rounded-full px-3 py-2 text-sm font-semibold"
            >
              Última aula
            </Link>
          )}
          {anterior ? (
            <Link href={href(anterior)} className={seta} aria-label="Aula da semana anterior">
              <Icone nome="anterior" width={18} height={18} />
            </Link>
          ) : (
            <span className={`${seta} pointer-events-none opacity-40`} aria-hidden="true">
              <Icone nome="anterior" width={18} height={18} />
            </span>
          )}
          {proxima ? (
            <Link href={href(proxima)} className={seta} aria-label="Aula da semana seguinte">
              <Icone nome="proximo" width={18} height={18} />
            </Link>
          ) : (
            <span className={`${seta} pointer-events-none opacity-40`} aria-hidden="true">
              <Icone nome="proximo" width={18} height={18} />
            </span>
          )}
        </div>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {dias.map((d) => {
          const conteudo = (
            <>
              <span
                className={`text-[0.7rem] font-semibold uppercase ${d.escolhido ? "text-white/80" : "text-apagado"}`}
              >
                {DIAS_CURTOS[d.diaSemana]}
              </span>
              <span className="text-lg leading-none font-extrabold tabular-nums">{d.dia}</span>
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  d.hoje
                    ? d.escolhido
                      ? "bg-white"
                      : "bg-ouro"
                    : d.temAula
                      ? "bg-roxo/60"
                      : "bg-transparent"
                }`}
              />
            </>
          );
          const base =
            "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl transition duration-200";
          return (
            <li key={d.data}>
              {d.disponivel ? (
                <Link
                  href={href(d.data)}
                  aria-current={d.escolhido ? "date" : undefined}
                  aria-label={`${DIAS_SEMANA[d.diaSemana]} ${d.dia}${d.hoje ? ", hoje" : ""}`}
                  className={`${base} ${
                    d.escolhido
                      ? "bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_10px_24px_-10px_rgb(124_58_237_/_0.9)]"
                      : "border-roxo/30 hover:bg-elevado border"
                  }`}
                >
                  {conteudo}
                </Link>
              ) : (
                <span
                  className={`${base} ${d.escolhido ? "border-borda border border-dashed" : ""} opacity-35`}
                  aria-hidden="true"
                >
                  {conteudo}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-apagado flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="border-roxo/40 size-3 rounded-md border" aria-hidden="true" /> Dia de
          aula
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-ouro size-1.5 rounded-full" aria-hidden="true" /> Hoje
        </span>
      </p>
    </nav>
  );
}
