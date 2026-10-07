"use client";

import { useActionState } from "react";
import { lancarAvulso } from "@/app/acoes/caixa";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { CATEGORIAS, CATEGORIAS_AVULSAS } from "@/lib/caixa/formatacao";
import { FORMAS } from "@/lib/mensalidades/formatacao";

/** CAIXA-CA-02: suprimento, sangria, despesa ou receita avulsa. */
export function FormAvulso() {
  const [estado, acao, enviando] = useActionState(lancarAvulso, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Lançamento avulso"
      className="border-borda bg-cartao flex flex-col gap-3 rounded-2xl border p-4"
    >
      <h3 className="font-medium">Lançamento avulso</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="categoria" className="text-sm font-medium">
            Tipo
          </label>
          <select
            id="categoria"
            name="categoria"
            className={classeCampo}
            defaultValue={valor("categoria", "DESPESA")}
          >
            {Object.entries(CATEGORIAS_AVULSAS).map(([categoria, info]) => (
              <option key={categoria} value={categoria}>
                {CATEGORIAS[categoria as keyof typeof CATEGORIAS]}: {info.ajuda}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="forma-avulso" className="text-sm font-medium">
            Forma
          </label>
          <select
            id="forma-avulso"
            name="forma"
            className={classeCampo}
            defaultValue={valor("forma", "DINHEIRO")}
          >
            {Object.entries(FORMAS).map(([forma, rotulo]) => (
              <option key={forma} value={forma}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Valor (R$)"
          id="valor-avulso"
          name="valor"
          inputMode="decimal"
          required
          placeholder="50,00"
          defaultValue={valor("valor")}
        />
        <Campo
          rotulo="Descrição"
          id="descricao"
          required
          minLength={3}
          maxLength={120}
          placeholder="Compra de garrafões de água"
          defaultValue={valor("descricao")}
        />
      </div>
      <p className="text-suave text-sm">
        Suprimento e sangria são só em dinheiro. Não escreva nome de aluno: o lançamento não pode
        ser alterado depois.
      </p>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <button type="submit" className={`${classeBotaoSecundario} self-start`} disabled={enviando}>
        Registrar lançamento
      </button>
    </form>
  );
}
