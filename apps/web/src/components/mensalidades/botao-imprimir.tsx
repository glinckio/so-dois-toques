"use client";

import { classeBotao } from "@/components/ui";

export function BotaoImprimir() {
  return (
    <button type="button" className={`${classeBotao} print:hidden`} onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </button>
  );
}
