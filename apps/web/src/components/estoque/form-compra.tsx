"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarCompra } from "@/app/acoes/estoque";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { FORMAS } from "@/lib/mensalidades/formatacao";

/** ESTQ-CA-02: entrada de mercadoria paga na hora. */
export function FormCompra({
  produtos,
  hoje,
}: {
  produtos: { id: string; nome: string; saldo: number }[];
  hoje: string;
}) {
  const [estado, acao, enviando] = useActionState(registrarCompra, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Registrar compra"
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="produtoId" className="text-sm font-medium">
            Produto
          </label>
          <select
            id="produtoId"
            name="produtoId"
            required
            className={classeCampo}
            defaultValue={valor("produtoId")}
          >
            <option value="">Escolha</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} (tem {p.saldo})
              </option>
            ))}
          </select>
        </div>
        <Campo
          rotulo="Quantidade"
          id="quantidade"
          type="number"
          min={1}
          max={10000}
          required
          defaultValue={valor("quantidade")}
        />
        <Campo
          rotulo="Valor total pago (R$)"
          id="total"
          inputMode="decimal"
          required
          placeholder="60,00"
          defaultValue={valor("total")}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="forma" className="text-sm font-medium">
            Forma de pagamento
          </label>
          <select
            id="forma"
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
          id="data"
          type="date"
          required
          max={hoje}
          defaultValue={valor("data", hoje)}
        />
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Registrando..." : "Registrar compra"}
      </button>
    </form>
  );
}
