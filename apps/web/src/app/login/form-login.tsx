"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes/sessao";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao } from "@/components/ui";

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <Campo
        rotulo="E-mail"
        id="email"
        type="email"
        autoComplete="username"
        required
        maxLength={254}
        defaultValue={estado.email}
      />
      <Campo
        rotulo="Senha"
        id="senha"
        type="password"
        autoComplete="current-password"
        required
        maxLength={1024}
      />
      <button type="submit" className={classeBotao} disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
