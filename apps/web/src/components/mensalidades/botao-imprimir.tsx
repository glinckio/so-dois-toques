"use client";

import { Icone } from "@/components/icones";
import { classeBotaoSecundario } from "@/components/ui";

/** Imprime a página (ou salva em PDF pelo navegador); some do papel. */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      className={`${classeBotaoSecundario} print:hidden`}
      onClick={() => window.print()}
    >
      <Icone nome="imprimir" width={18} height={18} />
      Imprimir ou salvar em PDF
    </button>
  );
}
