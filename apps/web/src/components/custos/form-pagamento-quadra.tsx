"use client";

import { useActionState } from "react";
import { registrarPagamentoQuadra } from "@/app/acoes/custos";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { FORMAS, nomeDoMes, valorParaCampo } from "@/lib/mensalidades/formatacao";

/** CUSTO-CA-03: valor sugerido é o custo previsto do mês. */
export function FormPagamentoQuadra({
  localId,
  localNome,
  competencia,
  sugeridoCentavos,
  hoje,
}: {
  localId: string;
  localNome: string;
  competencia: string;
  sugeridoCentavos: number | null;
  hoje: string;
}) {
  const [estado, acao, enviando] = useActionState(registrarPagamentoQuadra, ESTADO_INICIAL);
  const valor = (campo: string, salvo: string) => estado.valores?.[campo] ?? salvo;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label={`Registrar pagamento a ${localNome}`}
      className="border-borda bg-cartao flex flex-col gap-3 rounded-2xl border p-3"
    >
      <h3 className="font-medium">Registrar pagamento de {nomeDoMes(competencia)}</h3>
      <input type="hidden" name="localId" value={localId} />
      <input type="hidden" name="competencia" value={competencia} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo
          rotulo="Valor pago (R$)"
          id={`valor-${localId}`}
          name="valor"
          inputMode="decimal"
          required
          placeholder="150,00"
          defaultValue={valor("valor", sugeridoCentavos ? valorParaCampo(sugeridoCentavos) : "")}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={`forma-${localId}`} className="text-sm font-medium">
            Forma de pagamento
          </label>
          <select
            id={`forma-${localId}`}
            name="forma"
            className={classeCampo}
            defaultValue={valor("forma", "PIX")}
          >
            {Object.entries(FORMAS).map(([forma, rotulo]) => (
              <option key={forma} value={forma}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Data do pagamento"
          id={`data-${localId}`}
          name="data"
          type="date"
          required
          max={hoje}
          defaultValue={valor("data", hoje)}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Registrando..." : "Registrar pagamento"}
      </button>
    </form>
  );
}
