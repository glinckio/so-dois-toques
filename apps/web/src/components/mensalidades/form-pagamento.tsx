"use client";

import { useActionState, useId } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarPagamento } from "@/app/acoes/mensalidades";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos, type Opcao } from "@/components/base/opcoes";
import { SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Aviso, Campo, classeBotaoOuro, SetaDoBotao } from "@/components/ui";
import { FORMAS } from "@/lib/mensalidades/formatacao";

const FORMAS_EM_BLOCOS: Opcao[] = Object.entries(FORMAS).map(([valor, rotulo]) => ({
  valor,
  rotulo,
  icone: ICONES_DAS_FORMAS[valor],
}));

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
  const idTitulo = useId();
  return (
    <form
      action={acao}
      aria-labelledby={idTitulo}
      className="superficie @container flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <SeloIcone nome="dinheiro" tom="ouro" />
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg leading-tight font-bold">
              Registrar pagamento
            </h2>
            <p className="text-apagado mt-0.5 text-sm">Valor inteiro da mensalidade</p>
          </div>
        </div>
        <Valor
          centavos={valorCentavos}
          className="text-ouro shrink-0 text-2xl font-extrabold tracking-tight"
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <input type="hidden" name="mensalidadeId" value={mensalidadeId} />
      <OpcoesEmBlocos
        nome="forma"
        legenda="Forma de pagamento"
        opcoes={FORMAS_EM_BLOCOS}
        padrao="PIX"
        colunas="grid-cols-1 @sm:grid-cols-2"
      />
      <div className="sm:max-w-64">
        <Campo
          rotulo="Data do pagamento"
          id="data"
          type="date"
          icone="calendario"
          required
          max={hoje}
          defaultValue={hoje}
        />
      </div>
      <BotaoEnviar
        enviando={enviando}
        textoEnviando="Registrando..."
        className={`${classeBotaoOuro} sm:self-start`}
      >
        Registrar pagamento
        <SetaDoBotao />
      </BotaoEnviar>
    </form>
  );
}
