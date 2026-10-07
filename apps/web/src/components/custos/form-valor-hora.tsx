"use client";

import { useActionState } from "react";
import { definirValorHora } from "@/app/acoes/custos";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";
import { valorParaCampo } from "@/lib/mensalidades/formatacao";

/** CUSTO-CA-01: valor da hora do local parceiro (vazio apaga). */
export function FormValorHora({
  localId,
  valorHoraCentavos,
}: {
  localId: string;
  valorHoraCentavos: number | null;
}) {
  const [estado, acao, enviando] = useActionState(definirValorHora, ESTADO_INICIAL);
  const salvo = valorHoraCentavos === null ? "" : valorParaCampo(valorHoraCentavos);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Valor da hora"
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="localId" value={localId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Campo
            rotulo="Valor da hora (R$)"
            id={`valorHora-${localId}`}
            name="valorHora"
            prefixo="R$"
            inputMode="decimal"
            placeholder="80,00"
            defaultValue={estado.valores?.valorHora ?? salvo}
          />
        </div>
        <BotaoEnviar enviando={enviando} className={classeBotaoSecundario}>
          Salvar valor
        </BotaoEnviar>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
