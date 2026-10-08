import Link from "next/link";
import type { ReactNode } from "react";
import { Selo, SeloIcone, type Tom } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Icone, type NomeIcone } from "@/components/icones";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, formatarTelefone } from "@/lib/aulas/formatacao";
import { rotuloHora } from "@/lib/horarios/formatacao";
import type { ReservaDetalhe } from "@/lib/horarios/tipos";
import { DataDoIngresso, Ingresso } from "./ingresso";

const ROTULO = "text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase";

/**
 * A reserva como ingresso: a quadra, a folhinha do dia e o horário em cima, os dados
 * de quem reservou e, no canhoto, o valor com a situação do pagamento (ou o motivo,
 * no bloqueio). Reserva cancelada ganha o carimbo no lugar do selo do tipo.
 */
export function IngressoDaReserva({
  reserva: r,
  className = "",
}: {
  reserva: ReservaDetalhe;
  className?: string;
}) {
  const bloqueio = r.tipo === "BLOQUEIO";
  const horas = r.horaFim - r.horaInicio;
  const tipo: { rotulo: string; tom: Tom } = bloqueio
    ? { rotulo: "Bloqueio", tom: "neutro" }
    : r.serie
      ? { rotulo: "Fixa", tom: "roxo" }
      : { rotulo: "Avulsa", tom: "areia" };
  return (
    <Ingresso
      className={className}
      variante={r.canceladaEm ? "padrao" : "destaque"}
      topo={
        <>
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3">
              <SeloIcone nome="areia" tom="areia" />
              <span className="flex min-w-0 flex-col">
                <span className={ROTULO}>Quadra</span>
                <span className="truncate text-lg font-extrabold">{r.quadra}</span>
              </span>
            </span>
            {r.canceladaEm ? (
              <span className="animate-marcar border-perigo/80 text-perigo shrink-0 rotate-[-8deg] rounded-lg border-[3px] px-2.5 py-0.5 text-sm font-black tracking-[0.18em] uppercase">
                Cancelada
              </span>
            ) : (
              <Selo tom={tipo.tom}>{tipo.rotulo}</Selo>
            )}
          </div>
          <div className="flex items-center gap-4">
            <DataDoIngresso data={r.data} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
                {rotuloHora(r.horaInicio)}{" "}
                <span className="text-apagado text-base font-semibold">às</span>{" "}
                {rotuloHora(r.horaFim)}
              </p>
              <p className="text-suave text-sm">
                {horas} {horas === 1 ? "hora" : "horas"} de quadra
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {!bloqueio && (
              <Dado icone="telefone" rotulo="Telefone">
                {r.clienteTelefone ? formatarTelefone(r.clienteTelefone) : "Não informado"}
              </Dado>
            )}
            {r.serie && (
              <Dado icone="repetir" rotulo="Fixa">
                Toda semana de {formatarData(r.serie.dataInicio)} a {formatarData(r.serie.dataFim)}
                {r.serie.encerrada ? " (encerrada)" : ""} ·{" "}
                <Link href="/horarios/fixas" className="text-roxo-claro hover:text-texto underline">
                  ver fixas
                </Link>
              </Dado>
            )}
            <Dado icone="pessoa" rotulo="Criada por">
              {r.criadaPor} em {formatarDataHora(r.criadaEm)}
            </Dado>
          </dl>
        </>
      }
      canhoto={
        bloqueio ? (
          <div className="flex flex-col gap-1">
            <span className={ROTULO}>Motivo</span>
            <p className="text-lg font-semibold">{r.motivo}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className={ROTULO}>Valor</span>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Valor centavos={r.valorCentavos} className="text-3xl font-extrabold" />
              <span className="sr-only"> · </span>
              <Selo tom={r.pago ? "sucesso" : "ouro"} className="text-sm">
                <span data-testid="situacao-pagamento">{r.pago ? "Pago" : "A pagar"}</span>
              </Selo>
            </p>
          </div>
        )
      }
    />
  );
}

/** Um dado do ingresso: ícone, rótulo pequeno e o valor. */
function Dado({
  icone,
  rotulo,
  children,
}: {
  icone: NomeIcone;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icone nome={icone} width={16} height={16} className="text-apagado mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-apagado text-xs font-semibold">{rotulo}</dt>
        <dd className="text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}
