"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarVenda } from "@/app/acoes/estoque";
import { Aviso, classeBotao, classeCampo } from "@/components/ui";
import { itensDoFormulario, totalPrevisto } from "@/lib/estoque/formatacao";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";

type ProdutoVenda = { id: string; nome: string; precoCentavos: number; saldo: number };

/** ESTQ-CA-03: venda com vários produtos de uma vez. */
export function FormVenda({ produtos }: { produtos: ProdutoVenda[] }) {
  const [estado, acao, enviando] = useActionState(registrarVenda, ESTADO_INICIAL);
  const precos = new Map(produtos.map((p) => [p.id, p.precoCentavos]));
  const calcular = (campos: Iterable<[string, unknown]>) =>
    totalPrevisto(itensDoFormulario(campos) ?? [], precos);
  const [total, setTotal] = useState(0);
  // Depois de cada envio o formulário volta ao que a ação devolveu (vazio após a venda,
  // ou o que foi digitado após um erro): o total acompanha.
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estadoVisto !== estado) {
    setEstadoVisto(estado);
    setTotal(calcular(Object.entries(estado.valores ?? {})));
  }
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      onInput={(evento) => setTotal(calcular(new FormData(evento.currentTarget).entries()))}
      aria-label="Registrar venda"
      className="flex flex-col gap-4"
    >
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <ul className="divide-borda flex flex-col divide-y" aria-label="Produtos à venda">
        {produtos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <label htmlFor={`qtd-${p.id}`} className="flex flex-col">
              <span className="font-medium">{p.nome}</span>
              <span className="text-suave text-sm">
                {formatarReais(p.precoCentavos)} · tem {p.saldo}
              </span>
            </label>
            <input
              id={`qtd-${p.id}`}
              name={`qtd-${p.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={p.saldo}
              placeholder="0"
              disabled={p.saldo === 0}
              defaultValue={estado.valores?.[`qtd-${p.id}`] ?? ""}
              className={`${classeCampo} w-24 text-right`}
            />
          </li>
        ))}
      </ul>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Forma de pagamento</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(FORMAS).map(([valor, rotulo]) => (
            <label
              key={valor}
              className="border-borda has-checked:border-roxo has-checked:bg-roxo/15 flex min-h-11 items-center gap-2 rounded-md border px-3"
            >
              <input
                type="radio"
                name="forma"
                value={valor}
                required
                defaultChecked={(estado.valores?.forma ?? "PIX") === valor}
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-lg font-semibold" data-testid="total-venda">
        Total: {formatarReais(total)}
      </p>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Registrando..." : "Registrar venda"}
      </button>
    </form>
  );
}
