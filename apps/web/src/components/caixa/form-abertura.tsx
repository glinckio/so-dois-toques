"use client";

import { useActionState } from "react";
import { abrirCaixa } from "@/app/acoes/caixa";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { Aviso, Campo, classeBotaoOuro, SetaDoBotao } from "@/components/ui";

/** CAIXA-CA-01: abre o turno com o troco que está na gaveta. */
export function FormAbertura() {
  const [estado, acao, enviando] = useActionState(abrirCaixa, ESTADO_INICIAL);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Abrir caixa"
      className="vidro flex flex-col gap-4 rounded-[1.5rem] p-4 sm:p-5"
    >
      <Campo
        rotulo="Troco na gaveta (R$)"
        id="troco"
        prefixo="R$"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        defaultValue={estado.valores?.troco ?? ""}
        ajuda="Deixe em branco se a gaveta começar vazia."
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <BotaoEnviar enviando={enviando} className={`${classeBotaoOuro} w-full`}>
        Abrir caixa
        <SetaDoBotao />
      </BotaoEnviar>
    </form>
  );
}
