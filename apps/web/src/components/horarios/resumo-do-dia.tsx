import { Anel } from "@/components/base/anel";
import type { Agenda, SituacaoDoHorario } from "@/lib/horarios/agenda";
import { ROTULOS_DA_SITUACAO } from "@/lib/horarios/agenda";
import type { Grade } from "@/lib/horarios/tipos";
import { AMOSTRA_DA_SITUACAO } from "./estilos";

const ORDEM: (SituacaoDoHorario | "livre")[] = ["pago", "a-pagar", "fixa", "bloqueio", "livre"];

/**
 * Resumo do dia, o destaque da grade: a ocupação das quadras em anel (horas de
 * clientes sobre as horas abertas) e a legenda dos tipos de horário, com as horas de
 * cada um. A legenda usa o mesmo desenho dos blocos.
 */
export function ResumoDoDia({ agenda, grade }: { agenda: Agenda; grade: Grade }) {
  const fracao = agenda.abertas > 0 ? agenda.reservadas / agenda.abertas : 0;
  const todas = grade.quadras.flatMap((q) => q.reservas);
  const reservas = todas.filter((r) => r.tipo === "RESERVA").length;
  const bloqueios = todas.length - reservas;
  const aindaAberto = agenda.horas.some((h) => !h.passou);
  const partes = [
    `${reservas} ${reservas === 1 ? "reserva" : "reservas"}`,
    ...(bloqueios > 0 ? [`${bloqueios} ${bloqueios === 1 ? "bloqueio" : "bloqueios"}`] : []),
  ];
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
          fracao={fracao}
          tom="areia"
          tamanho={92}
          espessura={9}
          rotulo={`Ocupação: ${agenda.reservadas} de ${agenda.abertas} horas reservadas`}
        >
          <span className="text-lg font-extrabold tabular-nums">{Math.round(fracao * 100)}%</span>
        </Anel>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="titulo-resumo-do-dia"
            className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase"
          >
            Resumo do dia
          </h2>
          <p className="text-suave text-sm">
            <span className="text-texto text-3xl font-extrabold tabular-nums">
              {agenda.reservadas}
            </span>{" "}
            de {agenda.abertas} horas reservadas
          </p>
          <p className="text-apagado text-xs">
            {partes.join(" · ")}
            {aindaAberto &&
              ` · ${agenda.livresParaReservar} ${agenda.livresParaReservar === 1 ? "horário livre" : "horários livres"} para reservar`}
          </p>
        </div>
      </div>
      <ul
        id="legenda-da-grade"
        aria-label="Legenda da grade"
        className="relative flex flex-wrap gap-1.5"
      >
        {ORDEM.map((situacao) => (
          <li
            key={situacao}
            className="bg-noite/35 flex min-h-8 items-center gap-1.5 rounded-full border border-white/5 py-1 pr-3 pl-1.5 text-xs"
          >
            <span
              aria-hidden="true"
              className={`size-5 shrink-0 rounded-full border ${AMOSTRA_DA_SITUACAO[situacao]}`}
            />
            <span className="font-semibold">{ROTULOS_DA_SITUACAO[situacao]}</span>
            <span className="text-apagado tabular-nums">{agenda.horasPorSituacao[situacao]} h</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
