"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { ajustarEstoque } from "@/app/acoes/estoque";
import { CabecalhoCartao, Cartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";
import { saldoDepoisDoAjuste } from "@/lib/estoque/resumos";

/** ESTQ-CA-05: positivo entra, negativo sai; sempre com motivo. Mostra o saldo que vai ficar. */
export function FormAjuste({ produtoId, saldo }: { produtoId: string; saldo: number }) {
  const [estado, acao, enviando] = useActionState(ajustarEstoque, ESTADO_INICIAL);
  const [digitado, setDigitado] = useState("");
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estadoVisto !== estado) {
    setEstadoVisto(estado);
    setDigitado(estado.valores?.quantidade ?? "");
  }
  const depois = saldoDepoisDoAjuste(saldo, digitado);
  const negativo = depois !== null && depois < 0;
  return (
    <Cartao className="flex flex-col gap-5">
      <CabecalhoCartao
        icone="editar"
        tom="areia"
        titulo="Ajustar estoque"
        descricao="Perda, consumo interno ou inventário. Não mexe no Caixa."
      />
      <form
        key={JSON.stringify(estado.valores ?? null)}
        action={acao}
        aria-label="Ajustar estoque"
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="produtoId" value={produtoId} />
        <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
          <Campo
            rotulo="Quantidade"
            id="quantidade"
            inputMode="numeric"
            required
            placeholder="-2"
            defaultValue={estado.valores?.quantidade ?? ""}
            onChange={(evento) => setDigitado(evento.currentTarget.value)}
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
        <p
          aria-live="polite"
          className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3.5 py-2 text-sm transition-colors duration-300 ${
            depois === null
              ? "border-borda text-apagado border-dashed"
              : negativo
                ? "border-perigo/40 bg-perigo/10 text-perigo"
                : "border-borda bg-elevado/45"
          }`}
        >
          {depois === null ? (
            "Positivo soma, negativo tira."
          ) : negativo ? (
            <>
              <Icone nome="alerta" width={16} height={16} className="shrink-0" />
              Ficaria negativo: há {saldo} em estoque.
            </>
          ) : (
            <>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg ${
                  depois > saldo ? "bg-sucesso/15 text-sucesso" : "bg-perigo/15 text-perigo"
                }`}
              >
                <Icone nome={depois > saldo ? "entrada" : "saida"} width={15} height={15} />
              </span>
              <span>
                Saldo vai de <strong className="tabular-nums">{saldo}</strong> para{" "}
                <strong key={depois} className="animate-marcar inline-block tabular-nums">
                  {depois}
                </strong>
                .
              </span>
            </>
          )}
        </p>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <BotaoEnviar enviando={enviando} className={`${classeBotaoSecundario} self-start`}>
          Ajustar
        </BotaoEnviar>
      </form>
    </Cartao>
  );
}
