"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { salvarPlano } from "@/app/acoes/mensalidades";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotaoSecundario, classeCampo, classeRotulo } from "@/components/ui";
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
          : "superficie flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6"
      }
      aria-label={plano ? `Editar plano ${plano.nome}` : "Cadastrar plano"}
    >
      {!plano && (
        <CabecalhoCartao
          icone="mais"
          tom="ouro"
          titulo="Cadastrar plano"
          descricao="Quantas aulas por semana e o valor do mês."
        />
      )}
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      {plano && <input type="hidden" name="id" value={plano.id} />}
      <div className={`grid gap-4 ${plano ? "sm:grid-cols-2" : ""}`}>
        <Campo
          rotulo="Nome do plano"
          id={`nome${sufixo}`}
          name="nome"
          icone="recibo"
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
          icone="calendario"
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
          prefixo="R$"
          inputMode="decimal"
          required
          placeholder="150,00"
          defaultValue={valor("valor", plano ? valorParaCampo(plano.valorCentavos) : undefined)}
        />
        {plano && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`ativo${sufixo}`} className={classeRotulo}>
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
      <div>
        {plano ? (
          <BotaoEnviar enviando={enviando} className={classeBotaoSecundario}>
            Salvar plano
          </BotaoEnviar>
        ) : (
          <BotaoEnviar enviando={enviando} icone={<Icone nome="mais" width={18} height={18} />}>
            Cadastrar plano
          </BotaoEnviar>
        )}
      </div>
    </form>
  );
}
