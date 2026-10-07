"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarFaixas } from "@/app/acoes/horarios";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import {
  Aviso,
  Campo,
  classeBotao,
  classeCampo,
  classeCartao,
  classeRotulo,
} from "@/components/ui";
import { DIAS_CURTOS } from "@/lib/aulas/formatacao";
import { HORAS, rotuloHora } from "@/lib/horarios/formatacao";

/**
 * HOR-CA-01: mesma faixa de preço para um ou vários dias da semana. Os dias são
 * pílulas de marcar (a caixa continua visível dentro da pílula).
 */
export function FormFaixa() {
  const [estado, acao, enviando] = useActionState(criarFaixas, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Nova faixa de preço"
      className={`${classeCartao} flex flex-col gap-5`}
    >
      <CabecalhoCartao
        icone="mais"
        titulo="Nova faixa de preço"
        descricao="A mesma faixa vale para todos os dias marcados."
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${classeRotulo} mb-1.5`}>Dias da semana</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS_CURTOS.map((dia, i) => (
            <label
              key={dia}
              className="border-borda bg-elevado/40 has-checked:border-roxo has-checked:bg-roxo-forte/20 has-checked:text-texto text-suave flex min-h-11 cursor-pointer items-center gap-2 rounded-full border py-1 pr-4 pl-2.5 text-sm font-semibold transition duration-200 select-none hover:border-[#3a2f6b] active:scale-[0.97]"
            >
              <span className="relative grid size-5 shrink-0 place-items-center">
                <input
                  type="checkbox"
                  name="dias"
                  value={i}
                  className="peer border-borda checked:border-roxo checked:bg-roxo size-5 cursor-pointer appearance-none rounded-md border-2 transition-colors"
                />
                <Icone
                  nome="check"
                  width={12}
                  height={12}
                  strokeWidth={3.2}
                  className="text-fundo pointer-events-none absolute scale-0 transition-transform duration-200 peer-checked:scale-100"
                />
              </span>
              {dia}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="faixa-inicio" className={classeRotulo}>
            Das
          </label>
          <select
            id="faixa-inicio"
            name="horaInicio"
            className={classeCampo}
            defaultValue={valor("horaInicio", "8")}
          >
            {HORAS.map((h) => (
              <option key={h} value={h}>
                {rotuloHora(h)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="faixa-fim" className={classeRotulo}>
            Até
          </label>
          <select
            id="faixa-fim"
            name="horaFim"
            className={classeCampo}
            defaultValue={valor("horaFim", "22")}
          >
            {HORAS.map((h) => h + 1).map((h) => (
              <option key={h} value={h}>
                {rotuloHora(h)}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Valor da hora (R$)"
          id="valor"
          prefixo="R$"
          inputMode="decimal"
          required
          placeholder="80,00"
          defaultValue={valor("valor")}
        />
      </div>
      <BotaoEnviar
        enviando={enviando}
        textoEnviando="Salvando..."
        className={`${classeBotao} self-start`}
        icone={<Icone nome="mais" width={18} height={18} />}
      >
        Criar faixa
      </BotaoEnviar>
    </form>
  );
}
