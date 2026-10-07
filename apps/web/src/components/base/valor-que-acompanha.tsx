"use client";

import { useEffect, useRef, useState } from "react";
import { partesDoValor } from "./valor";

/**
 * Dinheiro que corre do valor anterior até o novo sempre que muda (total da venda,
 * custo da compra), com os centavos menores. Na primeira pintura já mostra o valor;
 * com "reduzir movimento", troca direto.
 */
export function ValorQueAcompanha({
  centavos,
  className = "",
}: {
  centavos: number;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(centavos);
  const atual = useRef(centavos);

  useEffect(() => {
    const de = atual.current;
    if (de === centavos) return;
    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const inicio = performance.now();
    const duracao = parado ? 0 : 450;
    let quadro = 0;
    const passo = (agora: number) => {
      const t = duracao === 0 ? 1 : Math.min(1, (agora - inicio) / duracao);
      const valor = Math.round(de + (centavos - de) * (1 - (1 - t) ** 3));
      atual.current = valor;
      setMostrado(valor);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [centavos]);

  const { inteiro, centavos: resto } = partesDoValor(mostrado);
  return (
    <span className={`tabular-nums ${className}`}>
      {inteiro}
      <span className="text-[0.62em] font-semibold opacity-70">{resto}</span>
    </span>
  );
}
