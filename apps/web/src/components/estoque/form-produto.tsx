"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { salvarProduto } from "@/app/acoes/estoque";
import { CabecalhoCartao, Cartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { OpcoesEmBlocos } from "@/components/base/opcoes";
import { Aviso, Campo, classeBotao, classeBotaoSecundario } from "@/components/ui";
import type { Produto } from "@/lib/estoque/tipos";
import { valorParaCampo } from "@/lib/mensalidades/formatacao";

/** ESTQ-CA-01: cadastro (sem `produto`) ou edição. */
export function FormProduto({ produto, id }: { produto?: Produto; id?: string }) {
  const [estado, acao, enviando] = useActionState(salvarProduto, ESTADO_INICIAL);
  const valor = (campo: string, salvo?: string) => estado.valores?.[campo] ?? salvo;
  return (
    <Cartao id={id} className="flex scroll-mt-6 flex-col gap-5">
      <CabecalhoCartao
        icone={produto ? "editar" : "mais"}
        tom={produto ? "neutro" : "roxo"}
        titulo={produto ? "Editar produto" : "Cadastrar produto"}
        descricao={
          produto
            ? "Nome, preço, mínimo e situação."
            : "Entra com saldo zero; a compra dá a entrada."
        }
      />
      <form
        key={JSON.stringify(estado.valores ?? null)}
        action={acao}
        aria-label={produto ? `Editar ${produto.nome}` : "Cadastrar produto"}
        className="flex flex-col gap-4"
      >
        {produto && <input type="hidden" name="id" value={produto.id} />}
        <Campo
          rotulo="Nome do produto"
          id="nome"
          icone="estoque"
          required
          minLength={2}
          maxLength={80}
          placeholder="Água 500 ml"
          defaultValue={valor("nome", produto?.nome)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Preço de venda (R$)"
            id="preco"
            prefixo="R$"
            inputMode="decimal"
            required
            placeholder="5,00"
            defaultValue={valor(
              "preco",
              produto ? valorParaCampo(produto.precoCentavos) : undefined,
            )}
          />
          <Campo
            rotulo="Estoque mínimo"
            id="estoqueMinimo"
            icone="alerta"
            type="number"
            min={0}
            max={10000}
            ajuda="Abaixo dele, o produto pede reposição."
            defaultValue={valor("estoqueMinimo", String(produto?.estoqueMinimo ?? 0))}
          />
        </div>
        {produto && (
          <OpcoesEmBlocos
            nome="ativo"
            legenda="Situação"
            idBase="situacao-produto"
            colunas="grid-cols-2"
            padrao={valor("ativo", String(produto.ativo))}
            opcoes={[
              { valor: "true", rotulo: "Ativo", icone: "check", detalhe: "Aparece na venda" },
              { valor: "false", rotulo: "Inativo", icone: "pausa", detalhe: "Fora da venda" },
            ]}
          />
        )}
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <BotaoEnviar
          enviando={enviando}
          className={`${produto ? classeBotaoSecundario : classeBotao} self-start`}
        >
          {produto ? "Salvar produto" : "Cadastrar produto"}
        </BotaoEnviar>
      </form>
    </Cartao>
  );
}
