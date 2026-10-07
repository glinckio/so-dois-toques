"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarPagamento } from "@/app/acoes/mensalidades";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";

/** MENS-CA-09: pagamento do valor inteiro, com forma e data (hoje ou antes). */
export function FormPagamento({
  mensalidadeId,
  valorCentavos,
  hoje,
}: {
  mensalidadeId: string;
  valorCentavos: number;
  hoje: string;
}) {
  const [estado, acao, enviando] = useActionState(registrarPagamento, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      <h2 className="text-lg font-medium">Registrar pagamento de {formatarReais(valorCentavos)}</h2>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <input type="hidden" name="mensalidadeId" value={mensalidadeId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Forma de pagamento</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(FORMAS).map(([valor, rotulo], i) => (
            <label
              key={valor}
              className="border-borda has-checked:border-roxo has-checked:bg-roxo/15 flex min-h-11 items-center gap-2 rounded-md border px-3"
            >
              <input type="radio" name="forma" value={valor} required defaultChecked={i === 0} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:w-60">
        <Campo
          rotulo="Data do pagamento"
          id="data"
          type="date"
          required
          max={hoje}
          defaultValue={hoje}
        />
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Registrando..." : "Registrar pagamento"}
      </button>
    </form>
  );
}
