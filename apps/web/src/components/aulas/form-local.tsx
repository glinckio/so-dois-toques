"use client";

import { useActionState } from "react";
import { criarLocal } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { OpcoesEmBlocos } from "@/components/base/opcoes";
import { Icone } from "@/components/icones";
import { Aviso, Campo } from "@/components/ui";

/** Cadastro de local: nome, tipo em blocos (parceira ou própria) e endereço. */
export function FormLocal() {
  const [estado, acao, enviando] = useActionState(criarLocal, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      aria-labelledby="titulo-cadastrar-local"
      className="superficie flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6"
    >
      <CabecalhoCartao
        id="titulo-cadastrar-local"
        icone="mais"
        titulo="Cadastrar local"
        descricao="Quadras onde as turmas treinam."
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <Campo
        rotulo="Nome do local"
        id="nome"
        icone="local"
        required
        minLength={2}
        maxLength={80}
        placeholder="Arena Sol Nascente"
      />
      <OpcoesEmBlocos
        nome="tipo"
        legenda="Tipo"
        padrao="PARCEIRA"
        colunas="grid-cols-1 sm:grid-cols-2"
        opcoes={[
          {
            valor: "PARCEIRA",
            rotulo: "Quadra parceira",
            icone: "local",
            detalhe: "Paga por hora de aula",
          },
          {
            valor: "PROPRIA",
            rotulo: "Quadra própria",
            icone: "inicio",
            detalhe: "Do Só Dois Toques",
          },
        ]}
      />
      <Campo rotulo="Endereço (opcional)" id="endereco" maxLength={200} />
      <div>
        <BotaoEnviar enviando={enviando} icone={<Icone nome="mais" width={18} height={18} />}>
          Cadastrar
        </BotaoEnviar>
      </div>
    </form>
  );
}
