"use client";

import { useActionState, useState } from "react";
import { trocarSenha } from "@/app/acoes/sessao";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { CampoSenha } from "@/components/base/campo-senha";
import { Icone } from "@/components/icones";
import { Aviso, classeBotao } from "@/components/ui";

export function FormTrocaSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, ESTADO_INICIAL);
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const conferem = nova === confirmacao;
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <CampoSenha
        rotulo="Senha atual"
        id="senhaAtual"
        autoComplete="current-password"
        required
      />
      <div className="flex flex-col gap-2">
        <CampoSenha
          rotulo="Nova senha"
          id="novaSenha"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
          aria-describedby="regras-senha"
          medirForca
          aoDigitar={setNova}
        />
        <p id="regras-senha" className="text-apagado text-xs">
          De 10 a 128 caracteres, diferente do e-mail e de senhas muito comuns. Uma frase com
          palavras soltas é fácil de lembrar e difícil de adivinhar.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <CampoSenha
          rotulo="Confirme a nova senha"
          id="confirmacao"
          autoComplete="new-password"
          required
          aoDigitar={setConfirmacao}
        />
        {confirmacao && (
          <p
            data-testid="confere-senha"
            aria-live="polite"
            className={`animate-surgir flex items-center gap-2 text-xs font-semibold ${
              conferem ? "text-sucesso" : "text-perigo"
            }`}
          >
            <Icone nome={conferem ? "check" : "fechar"} width={14} height={14} strokeWidth={2.6} />
            {conferem ? "As senhas conferem." : "As senhas ainda não conferem."}
          </p>
        )}
      </div>
      <BotaoEnviar enviando={enviando} textoEnviando="Salvando..." className={`${classeBotao} w-full`}>
        Salvar nova senha
      </BotaoEnviar>
    </form>
  );
}
