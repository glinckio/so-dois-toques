"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/acoes/estado";
import { Aviso, classeBotaoSecundario } from "@/components/ui";

type Acao = (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;

/** Botão que dispara uma Server Action, com confirmação opcional e o erro logo abaixo. */
export function BotaoAcao({
  acao,
  campos,
  rotulo,
  confirmar,
  className = classeBotaoSecundario,
}: {
  acao: Acao;
  campos: Record<string, string>;
  rotulo: string;
  confirmar?: string;
  className?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, ESTADO_INICIAL);
  return (
    <form
      action={executar}
      onSubmit={(evento) => {
        if (confirmar && !window.confirm(confirmar)) evento.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button type="submit" className={className} disabled={enviando}>
        {rotulo}
      </button>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
