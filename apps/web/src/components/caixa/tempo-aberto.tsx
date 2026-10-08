"use client";

import { Fragment, useCallback, useSyncExternalStore } from "react";
import { tempoDecorrido } from "@/lib/base/tempo";

/**
 * VIVO-CA-08: há quanto tempo o caixa está aberto ("2 h 14 min"), atualizado sozinho
 * a cada virada de minuto. O HTML do servidor já sai com o tempo certo (`agora` do
 * servidor), sem piscar na hidratação. Os números ficam grandes e as unidades menores.
 */
export function TempoAberto({
  desde,
  agora,
  className = "",
}: {
  desde: string;
  /** Instante em que o servidor montou a página (ISO). */
  agora: string;
  className?: string;
}) {
  const inicio = new Date(desde).getTime();
  const assinar = useCallback(
    (avisar: () => void) => {
      let relogio: ReturnType<typeof setTimeout> | undefined;
      // Agenda o próximo aviso para logo depois da virada do minuto contado desde a abertura.
      const agendar = () => {
        const passado = (((Date.now() - inicio) % 60_000) + 60_000) % 60_000;
        relogio = setTimeout(
          () => {
            avisar();
            agendar();
          },
          60_000 - passado + 250,
        );
      };
      // O navegador segura os relógios de abas escondidas: ao voltar, recalcula na hora.
      const aoVoltar = () => {
        if (document.visibilityState === "visible") avisar();
      };
      agendar();
      document.addEventListener("visibilitychange", aoVoltar);
      return () => {
        clearTimeout(relogio);
        document.removeEventListener("visibilitychange", aoVoltar);
      };
    },
    [inicio],
  );
  const texto = useSyncExternalStore(
    assinar,
    () => tempoDecorrido(desde),
    () => tempoDecorrido(desde, new Date(agora)),
  );
  return (
    <span className={`tabular-nums ${className}`}>
      {texto.split(" ").map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {/^\d+$/.test(parte) ? (
            parte
          ) : (
            <span className="text-[0.5em] font-bold tracking-normal opacity-75">{parte}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
}
