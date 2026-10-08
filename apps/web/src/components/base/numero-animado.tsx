"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { partesDoValor } from "./valor";

const nada = () => () => {};

/** Verdadeiro durante o HTML do servidor e a hidratação; falso quando montado no navegador. */
function useHidratando() {
  return useSyncExternalStore(
    nada,
    () => false,
    () => true,
  );
}

function movimentoReduzido() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Número que sobe até o valor quando a tela é aberta pelo menu. Na primeira carga
 * da página (HTML do servidor) já aparece pronto, sem piscar.
 */
export function NumeroAnimado({
  valor,
  formato = "reais",
  className = "",
  centavosMenores = false,
  testId,
}: {
  valor: number;
  formato?: "reais" | "inteiro";
  className?: string;
  centavosMenores?: boolean;
  testId?: string;
}) {
  const hidratando = useHidratando();
  // Montado no navegador (tela aberta pelo menu): começa do zero e sobe.
  const [mostrado, setMostrado] = useState(() =>
    hidratando || valor === 0 || movimentoReduzido() ? valor : 0,
  );
  const animou = useRef(false);

  useEffect(() => {
    if (animou.current || hidratando || valor === 0 || movimentoReduzido()) {
      animou.current = true;
      setMostrado(valor);
      return;
    }
    animou.current = true;
    const inicio = performance.now();
    const duracao = 900;
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      setMostrado(Math.round(valor * (1 - (1 - t) ** 4)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // A animação só acontece na montagem; o valor novo depois disso aparece direto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  if (formato === "inteiro") {
    return (
      <span className={`tabular-nums ${className}`} data-testid={testId}>
        {mostrado.toLocaleString("pt-BR")}
      </span>
    );
  }
  if (!centavosMenores) {
    return (
      <span className={`tabular-nums ${className}`} data-testid={testId}>
        {formatarReais(mostrado)}
      </span>
    );
  }
  const { inteiro, centavos } = partesDoValor(mostrado);
  return (
    <span className={`tabular-nums ${className}`} data-testid={testId}>
      {inteiro}
      <span className="text-[0.62em] font-semibold opacity-70">{centavos}</span>
    </span>
  );
}
