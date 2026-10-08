import Link from "next/link";
import { PontoVivo } from "@/components/base/selo";
import { Icone } from "@/components/icones";
import type { Turno } from "@/lib/caixa/tipos";

const HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Situação do caixa no rodapé do menu lateral, para quem usa o Caixa: aberto (ponto
 * verde pulsando, desde quando e por quem) ou fechado. Leva à tela do Caixa.
 */
export function StatusDoCaixa({ turno }: { turno: Turno | null }) {
  const aberto = turno !== null && turno.fechadaEm === null;
  return (
    <Link
      href="/caixa"
      data-testid="status-caixa-menu"
      className={`group relative flex items-center gap-3 overflow-hidden rounded-[1.25rem] border p-3.5 transition-colors ${
        aberto
          ? "border-sucesso/30 hover:border-sucesso/50 bg-linear-to-br from-[#0d2a20] to-transparent"
          : "border-borda hover:border-roxo/40 bg-elevado/40"
      }`}
    >
      {aberto && (
        <span
          aria-hidden="true"
          className="bg-sucesso/20 absolute -top-6 -right-6 size-20 rounded-full blur-2xl"
        />
      )}
      <span
        className={`relative grid size-10 shrink-0 place-items-center rounded-2xl ${
          aberto ? "bg-sucesso/15 text-sucesso" : "bg-elevado text-apagado"
        }`}
      >
        <Icone nome="caixa" width={19} height={19} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold">
          {aberto ? (
            <PontoVivo />
          ) : (
            <span aria-hidden="true" className="bg-apagado size-2.5 rounded-full" />
          )}
          {aberto ? "Caixa aberto" : "Caixa fechado"}
        </span>
        <span className="text-apagado block truncate text-xs">
          {aberto
            ? `desde ${HORA.format(new Date(turno.abertaEm))} · ${turno.abertaPor.split(" ")[0]}`
            : "Abra o turno para vender"}
        </span>
      </span>
      <Icone
        nome="proximo"
        width={16}
        height={16}
        className="text-apagado group-hover:text-texto relative shrink-0 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
