"use client";

import { useActionState } from "react";
import { trocarSenha } from "@/app/acoes/sessao";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao } from "@/components/ui";

export function FormTrocaSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <Campo
        rotulo="Senha atual"
        id="senhaAtual"
        type="password"
        autoComplete="current-password"
        required
      />
      <Campo
        rotulo="Nova senha"
        id="novaSenha"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
        aria-describedby="regras-senha"
      />
      <p id="regras-senha" className="-mt-2 text-sm opacity-70">
        De 10 a 128 caracteres, diferente do e-mail e de senhas muito comuns.
      </p>
      <Campo
        rotulo="Confirme a nova senha"
        id="confirmacao"
        type="password"
        autoComplete="new-password"
        required
      />
      <button type="submit" className={classeBotao} disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
