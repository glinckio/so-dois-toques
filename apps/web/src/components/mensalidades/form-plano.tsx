"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { salvarPlano } from "@/app/acoes/mensalidades";
import { Aviso, Campo, classeBotao, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { valorParaCampo } from "@/lib/mensalidades/formatacao";
import type { Plano } from "@/lib/mensalidades/tipos";

/** Cadastro de plano (sem `plano`) ou edição de um plano existente. */
export function FormPlano({ plano }: { plano?: Plano }) {
  const [estado, acao, enviando] = useActionState(salvarPlano, ESTADO_INICIAL);
  const sufixo = plano ? `-${plano.id}` : "";
  // Depois de um erro, os campos voltam ao que foi digitado, não ao plano salvo.
  const valor = (campo: string, salvo?: string) => estado.valores?.[campo] ?? salvo;
  return (
    <form
      // Remonta o formulário quando os valores devolvidos mudam: o React não atualiza o
      // valor inicial de um <select> depois de montado.
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      className={
        plano
          ? "flex flex-col gap-3"
          : "border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
      }
      aria-label={plano ? `Editar plano ${plano.nome}` : "Cadastrar plano"}
    >
      {!plano && <h2 className="text-lg font-medium">Cadastrar plano</h2>}
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      {plano && <input type="hidden" name="id" value={plano.id} />}
      <div className="grid gap-4 sm:grid-cols-4">
        <Campo
          rotulo="Nome do plano"
          id={`nome${sufixo}`}
          name="nome"
          required
          minLength={2}
          maxLength={60}
          defaultValue={valor("nome", plano?.nome)}
          placeholder="2x por semana"
        />
        <Campo
          rotulo="Aulas por semana"
          id={`aulasPorSemana${sufixo}`}
          name="aulasPorSemana"
          type="number"
          min={1}
          max={7}
          required
          defaultValue={valor("aulasPorSemana", String(plano?.aulasPorSemana ?? 2))}
        />
        <Campo
          rotulo="Valor mensal (R$)"
          id={`valor${sufixo}`}
          name="valor"
          inputMode="decimal"
          required
          placeholder="150,00"
          defaultValue={valor("valor", plano ? valorParaCampo(plano.valorCentavos) : undefined)}
        />
        {plano && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`ativo${sufixo}`} className="text-sm font-medium">
              Situação
            </label>
            <select
              id={`ativo${sufixo}`}
              name="ativo"
              className={classeCampo}
              defaultValue={valor("ativo", String(plano.ativo))}
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        )}
      </div>
      <button
        type="submit"
        className={`${plano ? classeBotaoSecundario : classeBotao} self-start`}
        disabled={enviando}
      >
        {plano ? "Salvar plano" : "Cadastrar plano"}
      </button>
    </form>
  );
}
