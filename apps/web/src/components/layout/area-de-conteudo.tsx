"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Telas que ocupam toda a área ao lado do menu, sem a barra do topo (CHAT-CA-15). */
const TELAS_CHEIAS = ["/chat"];

export function telaCheia(caminho: string): boolean {
  return TELAS_CHEIAS.includes(caminho);
}

/**
 * Área de conteúdo do sistema. Nas telas cheias (o Chat), some a barra do topo (busca
 * rápida e data) e o conteúdo vai até as bordas, com o menu continuando ao lado.
 */
export function AreaDeConteudo({
  barraDoTopo,
  children,
}: {
  barraDoTopo: ReactNode;
  children: ReactNode;
}) {
  const cheia = telaCheia(usePathname());
  return (
    <div
      className={`lg:border-borda/70 lg:bg-fundo/80 flex min-h-full flex-1 flex-col lg:rounded-[2rem] lg:border lg:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)] ${cheia ? "lg:h-[calc(100dvh-2rem)] lg:min-h-0 lg:overflow-hidden" : ""}`}
    >
      {!cheia && barraDoTopo}
      <main
        className={
          cheia
            ? "flex w-full min-w-0 flex-1 flex-col px-2 pt-2 pb-24 sm:px-3 lg:min-h-0 lg:p-3"
            : "mx-auto flex w-full max-w-[84rem] min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-32 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10 print:p-0"
        }
      >
        {children}
      </main>
    </div>
  );
}
