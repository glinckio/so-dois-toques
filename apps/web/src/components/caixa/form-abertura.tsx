"use client";

import { useActionState } from "react";
import { abrirCaixa } from "@/app/acoes/caixa";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao } from "@/components/ui";

/** CAIXA-CA-01: abre o turno com o troco que está na gaveta. */
export function FormAbertura() {
  const [estado, acao, enviando] = useActionState(abrirCaixa, ESTADO_INICIAL);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Abrir caixa"
      className="flex flex-col gap-3"
    >
      <div className="sm:w-60">
        <Campo
          rotulo="Troco na gaveta (R$)"
          id="troco"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={estado.valores?.troco ?? ""}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        Abrir caixa
      </button>
    </form>
  );
}
