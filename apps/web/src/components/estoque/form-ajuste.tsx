"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { ajustarEstoque } from "@/app/acoes/estoque";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";

/** ESTQ-CA-05: positivo entra, negativo sai; sempre com motivo. */
export function FormAjuste({ produtoId }: { produtoId: string }) {
  const [estado, acao, enviando] = useActionState(ajustarEstoque, ESTADO_INICIAL);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Ajustar estoque"
      className="flex flex-col gap-3 rounded-lg border border-current/15 p-4"
    >
      <h2 className="text-lg font-medium">Ajustar estoque</h2>
      <p className="text-sm opacity-80">
        Use para perda, consumo interno ou inventário. Positivo soma, negativo tira. Não mexe no
        Caixa.
      </p>
      <input type="hidden" name="produtoId" value={produtoId} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Campo
          rotulo="Quantidade"
          id="quantidade"
          inputMode="numeric"
          required
          placeholder="-2"
          defaultValue={estado.valores?.quantidade ?? ""}
        />
        <Campo
          rotulo="Motivo"
          id="motivo"
          required
          minLength={3}
          maxLength={200}
          placeholder="Venceu"
          defaultValue={estado.valores?.motivo ?? ""}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <button type="submit" className={`${classeBotaoSecundario} self-start`} disabled={enviando}>
        Ajustar
      </button>
    </form>
  );
}
