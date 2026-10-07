import type { ReactNode } from "react";
import { DIAS_CURTOS } from "@/lib/aulas/formatacao";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** A data como folhinha de calendário (o texto completo da data fica no cabeçalho da tela). */
export function DataDoIngresso({ data }: { data: string }) {
  const [, mes, dia] = data.split("-");
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  return (
    <span
      aria-hidden="true"
      className="bg-noite/45 flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-white/10 py-2.5"
    >
      <span className="text-ouro text-[0.65rem] font-bold tracking-[0.14em] uppercase">
        {DIAS_CURTOS[diaSemana]}
      </span>
      <span className="text-3xl leading-none font-extrabold tabular-nums">{dia}</span>
      <span className="text-apagado text-xs font-semibold">{MESES[Number(mes) - 1]}</span>
    </span>
  );
}

/*
 * Picote do ingresso: dois meios-círculos recortados nas laterais, por máscara (a CSP
 * não deixa estilo embutido). Cada camada cobre uma metade e tem o furo no seu canto.
 */
const RECORTE_EMBAIXO =
  "[mask-image:radial-gradient(circle_at_0_100%,transparent_0.8rem,#000_0.84rem),radial-gradient(circle_at_100%_100%,transparent_0.8rem,#000_0.84rem)] [mask-size:51%_100%] [mask-position:left,right] [mask-repeat:no-repeat]";
const RECORTE_EM_CIMA =
  "[mask-image:radial-gradient(circle_at_0_0,transparent_0.8rem,#000_0.84rem),radial-gradient(circle_at_100%_0,transparent_0.8rem,#000_0.84rem)] [mask-size:51%_100%] [mask-position:left,right] [mask-repeat:no-repeat]";

const TOPOS = {
  /** O ingresso em destaque (a reserva aberta). */
  destaque: "border-roxo/40 bg-linear-to-br from-[#2a1663] via-[#160c38] to-cartao",
  padrao: "border-borda bg-cartao bg-linear-to-b from-white/[0.035] to-transparent",
} as const;

/**
 * Cartão em forma de ingresso: a parte de cima (quem, onde e quando), o picote com os
 * recortes nas laterais e o canhoto (valor e situação).
 */
export function Ingresso({
  topo,
  canhoto,
  variante = "destaque",
  className = "",
}: {
  topo: ReactNode;
  canhoto: ReactNode;
  variante?: keyof typeof TOPOS;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col drop-shadow-[0_28px_36px_rgb(0_0_0_/_0.45)] ${className}`}
    >
      <div
        className={`relative flex flex-col gap-5 overflow-hidden rounded-t-[1.75rem] rounded-b-lg border-x border-t p-5 pb-7 sm:p-6 sm:pb-8 ${TOPOS[variante]} ${RECORTE_EMBAIXO}`}
      >
        {variante === "destaque" && (
          <span
            aria-hidden="true"
            className="bg-roxo/25 absolute -top-24 -right-20 size-64 rounded-full blur-3xl"
          />
        )}
        <div className="relative flex flex-col gap-5">{topo}</div>
      </div>
      <div
        className={`border-borda bg-elevado/90 relative flex flex-col gap-4 rounded-t-lg rounded-b-[1.75rem] border-x border-b p-5 pt-7 sm:p-6 sm:pt-8 ${RECORTE_EM_CIMA}`}
      >
        <span
          aria-hidden="true"
          className="border-apagado/40 absolute inset-x-7 top-0 border-t-2 border-dashed"
        />
        {canhoto}
      </div>
    </div>
  );
}
