"use client";

import { useActionState } from "react";
import { fecharCaixa } from "@/app/acoes/caixa";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { formatarReais } from "@/lib/mensalidades/formatacao";

/** CAIXA-CA-04: conta a gaveta; diferença exige observação. */
export function FormFechamento({
  turnoId,
  esperadoCentavos,
}: {
  turnoId: string;
  esperadoCentavos: number;
}) {
  const [estado, acao, enviando] = useActionState(fecharCaixa, ESTADO_INICIAL);
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Fechar caixa"
      className="border-borda bg-cartao flex flex-col gap-3 rounded-2xl border p-4"
    >
      <h3 className="font-medium">Fechar caixa</h3>
      <p className="text-suave text-sm">
        Conte o dinheiro da gaveta. O esperado agora é {formatarReais(esperadoCentavos)}.
      </p>
      <input type="hidden" name="turnoId" value={turnoId} />
      <div className="sm:w-60">
        <Campo
          rotulo="Dinheiro contado (R$)"
          id="contado"
          inputMode="decimal"
          required
          placeholder="0,00"
          defaultValue={estado.valores?.contado ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="observacao" className="text-sm font-medium">
          Observação (obrigatória se não bater)
        </label>
        <textarea
          id="observacao"
          name="observacao"
          maxLength={300}
          rows={2}
          className={`${classeCampo} py-2`}
          defaultValue={estado.valores?.observacao ?? ""}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        Fechar caixa
      </button>
    </form>
  );
}
