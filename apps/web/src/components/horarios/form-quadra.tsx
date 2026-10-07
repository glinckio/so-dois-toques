"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { renomearQuadra } from "@/app/acoes/horarios";
import { BotaoEnviar } from "@/components/base/enviar";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";
import type { Quadra } from "@/lib/horarios/tipos";

/** Nome da quadra que aparece na grade. */
export function FormQuadra({ quadra }: { quadra: Quadra }) {
  const [estado, acao, enviando] = useActionState(renomearQuadra, ESTADO_INICIAL);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label={`Renomear ${quadra.nome}`}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="quadraId" value={quadra.id} />
      <div className="flex items-end gap-2">
        <div className="grow">
          <Campo
            rotulo={`Nome da ${quadra.nome}`}
            id={`nome-${quadra.id}`}
            name="nome"
            icone="areia"
            required
            minLength={2}
            maxLength={40}
            defaultValue={estado.valores?.["nome"] ?? quadra.nome}
          />
        </div>
        <BotaoEnviar enviando={enviando} className={classeBotaoSecundario}>
          Salvar
        </BotaoEnviar>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
