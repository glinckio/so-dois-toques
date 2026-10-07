"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { pagarReserva } from "@/app/acoes/horarios";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos } from "@/components/base/opcoes";
import { Valor } from "@/components/base/valor";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoOuro } from "@/components/ui";
import { FORMAS } from "@/lib/mensalidades/formatacao";

const OPCOES = Object.entries(FORMAS).map(([forma, rotulo]) => ({
  valor: forma,
  rotulo,
  icone: ICONES_DAS_FORMAS[forma],
}));

/** HOR-CA-07: recebe o valor da reserva e lança no caixa; a forma é escolhida em blocos. */
export function FormPagamento({
  reservaId,
  valorCentavos,
}: {
  reservaId: string;
  valorCentavos: number;
}) {
  const [estado, acao, enviando] = useActionState(pagarReserva, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      aria-label="Receber pagamento"
      className="border-ouro/30 via-cartao to-cartao relative flex flex-col gap-5 overflow-hidden rounded-[1.75rem] border bg-linear-to-br from-[#2b2008] p-5 sm:p-6"
    >
      <span
        aria-hidden="true"
        className="bg-ouro/15 absolute -top-14 -right-14 size-40 rounded-full blur-2xl"
      />
      <div className="relative">
        <CabecalhoCartao
          icone="dinheiro"
          tom="ouro"
          titulo={
            <>
              Receber <Valor centavos={valorCentavos} />
            </>
          }
          descricao="O pagamento é lançado no Caixa."
        />
      </div>
      <input type="hidden" name="reservaId" value={reservaId} />
      <div className="relative">
        <OpcoesEmBlocos
          nome="forma"
          legenda="Forma de pagamento"
          padrao="PIX"
          colunas="grid-cols-1 sm:grid-cols-2 lg:grid-cols-1"
          opcoes={OPCOES}
        />
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <BotaoEnviar
        enviando={enviando}
        textoEnviando="Registrando..."
        className={`${classeBotaoOuro} w-full`}
        icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
      >
        Registrar pagamento
      </BotaoEnviar>
    </form>
  );
}
