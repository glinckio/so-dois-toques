"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { salvarProduto } from "@/app/acoes/estoque";
import { Aviso, Campo, classeBotao, classeBotaoSecundario, classeCampo } from "@/components/ui";
import type { Produto } from "@/lib/estoque/tipos";
import { valorParaCampo } from "@/lib/mensalidades/formatacao";

/** ESTQ-CA-01: cadastro (sem `produto`) ou edição. */
export function FormProduto({ produto }: { produto?: Produto }) {
  const [estado, acao, enviando] = useActionState(salvarProduto, ESTADO_INICIAL);
  const valor = (campo: string, salvo?: string) => estado.valores?.[campo] ?? salvo;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label={produto ? `Editar ${produto.nome}` : "Cadastrar produto"}
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      <h2 className="text-lg font-medium">{produto ? "Editar produto" : "Cadastrar produto"}</h2>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo
          rotulo="Nome do produto"
          id="nome"
          required
          minLength={2}
          maxLength={80}
          placeholder="Água 500 ml"
          defaultValue={valor("nome", produto?.nome)}
        />
        <Campo
          rotulo="Preço de venda (R$)"
          id="preco"
          inputMode="decimal"
          required
          placeholder="5,00"
          defaultValue={valor("preco", produto ? valorParaCampo(produto.precoCentavos) : undefined)}
        />
        <Campo
          rotulo="Estoque mínimo"
          id="estoqueMinimo"
          type="number"
          min={0}
          max={10000}
          defaultValue={valor("estoqueMinimo", String(produto?.estoqueMinimo ?? 0))}
        />
        {produto && (
          <div className="flex flex-col gap-1">
            <label htmlFor="ativo" className="text-sm font-medium">
              Situação
            </label>
            <select
              id="ativo"
              name="ativo"
              className={classeCampo}
              defaultValue={valor("ativo", String(produto.ativo))}
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        )}
      </div>
      <button
        type="submit"
        className={`${produto ? classeBotaoSecundario : classeBotao} self-start`}
        disabled={enviando}
      >
        {produto ? "Salvar produto" : "Cadastrar produto"}
      </button>
    </form>
  );
}
