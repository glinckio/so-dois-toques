"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarFaixas } from "@/app/acoes/horarios";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { DIAS_CURTOS } from "@/lib/aulas/formatacao";
import { HORAS, rotuloHora } from "@/lib/horarios/formatacao";

/** HOR-CA-01: mesma faixa de preço para um ou vários dias da semana. */
export function FormFaixa() {
  const [estado, acao, enviando] = useActionState(criarFaixas, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Nova faixa de preço"
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      <h2 className="font-medium">Nova faixa de preço</h2>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-sm font-medium">Dias da semana</legend>
        {DIAS_CURTOS.map((dia, i) => (
          <label key={dia} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="dias" value={i} />
            {dia}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="faixa-inicio" className="text-sm font-medium">
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
        <div className="flex flex-col gap-1">
          <label htmlFor="faixa-fim" className="text-sm font-medium">
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
          inputMode="decimal"
          required
          placeholder="80,00"
          defaultValue={valor("valor")}
        />
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Salvando..." : "Criar faixa"}
      </button>
    </form>
  );
}
