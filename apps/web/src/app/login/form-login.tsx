"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes/sessao";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { CampoSenha } from "@/components/base/campo-senha";
import { BotaoEnviar } from "@/components/base/enviar";
import { Aviso, Campo, SetaDoBotao, classeBotao } from "@/components/ui";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <Campo
        rotulo="E-mail"
        id="email"
        type="email"
        icone="email"
        autoComplete="username"
        required
        maxLength={254}
        placeholder="voce@sodoistoques.com.br"
        defaultValue={estado.email}
      />
      <CampoSenha
        rotulo="Senha"
        id="senha"
        autoComplete="current-password"
        required
        maxLength={1024}
      />
      <BotaoEnviar enviando={enviando} textoEnviando="Entrando..." className={`${classeBotao} mt-2 w-full`}>
        Entrar
        <SetaDoBotao />
      </BotaoEnviar>
    </form>
  );
}
