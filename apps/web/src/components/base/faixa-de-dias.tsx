import Link from "next/link";
import { Icone } from "@/components/icones";
import { DIAS_CURTOS } from "@/lib/aulas/formatacao";
import { deslocar, semanaDe } from "@/lib/base/semana";
import { nomeDoMes } from "@/lib/mensalidades/formatacao";

/**
 * VIVO-CA-06: os sete dias da semana da data escolhida, com o dia escolhido em
 * roxo e hoje com um ponto dourado. As setas andam uma semana.
 */
export function FaixaDeDias({
  data,
  hoje,
  caminho,
  rotulo = "Escolher dia",
  ateHoje = false,
}: {
  data: string;
  hoje: string;
  /** Página que recebe `?data=`. */
  caminho: string;
  rotulo?: string;
  /** Não deixa escolher dias depois de hoje (caixa). */
  ateHoje?: boolean;
}) {
  const semana = semanaDe(data);
  const href = (d: string) => `${caminho}?data=${d}`;
  const anterior = deslocar(data, -7);
  const proxima = deslocar(data, 7);
  const mes = nomeDoMes(data.slice(0, 7));
  const seta =
    "grid size-10 shrink-0 place-items-center rounded-full border border-borda bg-elevado/60 text-suave transition hover:border-roxo/50 hover:text-texto";
  return (
    <nav aria-label={rotulo} className="superficie flex flex-col gap-3 rounded-[1.75rem] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="font-bold first-letter:uppercase">{mes}</p>
        <div className="flex items-center gap-2">
          {data !== hoje && (
            <Link
              href={href(hoje)}
              className="text-ouro hover:bg-ouro/10 rounded-full px-3 py-2 text-sm font-semibold"
            >
              Hoje
            </Link>
          )}
          <Link href={href(anterior)} className={seta} aria-label="Semana anterior">
            <Icone nome="anterior" width={18} height={18} />
          </Link>
          {ateHoje && proxima > hoje && semana.at(-1)!.data >= hoje ? (
            <span className={`${seta} pointer-events-none opacity-40`} aria-hidden="true">
              <Icone nome="proximo" width={18} height={18} />
            </span>
          ) : (
            <Link href={href(ateHoje && proxima > hoje ? hoje : proxima)} className={seta} aria-label="Próxima semana">
              <Icone nome="proximo" width={18} height={18} />
            </Link>
          )}
        </div>
      </div>
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {semana.map((d) => {
          const escolhido = d.data === data;
          const ehHoje = d.data === hoje;
          const futuroBloqueado = ateHoje && d.data > hoje;
          const conteudo = (
            <>
              <span className={`text-[0.7rem] font-semibold uppercase ${escolhido ? "text-white/80" : "text-apagado"}`}>
                {DIAS_CURTOS[d.diaSemana]}
              </span>
              <span className="text-lg leading-none font-extrabold tabular-nums">{d.dia}</span>
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${ehHoje ? (escolhido ? "bg-white" : "bg-ouro") : "bg-transparent"}`}
              />
            </>
          );
          const classe = `flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl transition duration-200 ${
            escolhido
              ? "bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_10px_24px_-10px_rgb(124_58_237_/_0.9)]"
              : "hover:bg-elevado"
          }`;
          return (
            <li key={d.data}>
              {futuroBloqueado ? (
                <span className={`${classe} opacity-35`} aria-disabled="true">
                  {conteudo}
                </span>
              ) : (
                <Link
                  href={href(d.data)}
                  aria-current={escolhido ? "date" : undefined}
                  aria-label={`${DIAS_CURTOS[d.diaSemana]} ${d.dia}${ehHoje ? ", hoje" : ""}`}
                  className={classe}
                >
                  {conteudo}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
