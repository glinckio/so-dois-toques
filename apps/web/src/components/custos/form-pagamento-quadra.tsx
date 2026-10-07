"use client";

import { useActionState } from "react";
import { registrarPagamentoQuadra } from "@/app/acoes/custos";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotaoOuro, classeCampo, classeRotulo } from "@/components/ui";
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
      className="border-ouro/25 via-cartao to-cartao flex flex-col gap-4 rounded-[1.5rem] border bg-linear-to-br from-[#2b2008]/70 p-4 sm:p-5"
    >
      <h3 className="flex items-center gap-2 font-bold">
        <Icone nome="saida" width={17} height={17} className="text-ouro" />
        Registrar pagamento de {nomeDoMes(competencia)}
      </h3>
      <input type="hidden" name="localId" value={localId} />
      <input type="hidden" name="competencia" value={competencia} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo
          rotulo="Valor pago (R$)"
          id={`valor-${localId}`}
          name="valor"
          prefixo="R$"
          inputMode="decimal"
          required
          placeholder="150,00"
          defaultValue={valor("valor", sugeridoCentavos ? valorParaCampo(sugeridoCentavos) : "")}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`forma-${localId}`} className={classeRotulo}>
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
      <div className="flex flex-wrap items-center gap-3">
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Registrando..."
          className={classeBotaoOuro}
          icone={<Icone nome="dinheiro" width={18} height={18} />}
        >
          Registrar pagamento
        </BotaoEnviar>
        <span className="text-apagado text-xs">Sai do Caixa como despesa da quadra.</span>
      </div>
    </form>
  );
}
