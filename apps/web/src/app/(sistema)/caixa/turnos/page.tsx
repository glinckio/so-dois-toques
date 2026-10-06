import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import type { TurnoResumo } from "@/lib/caixa/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Turnos do caixa | Só Dois Toques" };

/** CAIXA-CA-05: turnos, mais recentes primeiro. */
export default async function PaginaTurnos() {
  await connection();
  const resposta = await chamarApi<TurnoResumo[]>("/caixa/sessoes");
  return (
    <>
      <h1 className="text-2xl font-semibold">Turnos do caixa</h1>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.length === 0 ? (
        <p className="opacity-80">O caixa ainda não foi aberto nenhuma vez.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-current/10" aria-label="Turnos">
          {resposta.dados.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <Link href={`/caixa/turnos/${t.id}`} className="font-medium underline">
                  {formatarDataHora(t.abertaEm)}
                </Link>
                <span className="block text-sm opacity-80">
                  Aberto por {t.abertaPor}
                  {t.fechadaEm
                    ? ` · fechado por ${t.fechadaPor} em ${formatarDataHora(t.fechadaEm)}`
                    : " · aberto agora"}
                </span>
              </span>
              {t.diferencaCentavos !== null && (
                <span
                  className={`text-sm font-medium ${t.diferencaCentavos === 0 ? "" : "text-red-700 dark:text-red-400"}`}
                >
                  {t.diferencaCentavos === 0
                    ? "Bateu"
                    : `Diferença ${formatarReais(t.diferencaCentavos)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
