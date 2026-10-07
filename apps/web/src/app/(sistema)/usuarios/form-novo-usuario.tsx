"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarUsuario } from "@/app/acoes/usuarios";
import { BotaoEnviar } from "@/components/base/enviar";
import { OpcoesEmBlocos } from "@/components/base/opcoes";
import { SeloIcone } from "@/components/base/selo";
import { Aviso, Campo, classeBotao } from "@/components/ui";
import { SenhaTemporaria } from "./senha-temporaria";

const PERFIS_EM_BLOCOS = [
  { valor: "ADMINISTRADOR", rotulo: "Administrador", icone: "escudo", detalhe: "Tudo" },
  { valor: "PROFESSOR", rotulo: "Professor", icone: "aulas", detalhe: "Início e Aulas" },
  { valor: "ATENDENTE", rotulo: "Atendente", icone: "caixa", detalhe: "Quadras, estoque e caixa" },
] as const;

/** Cadastro de usuário num cartão próprio; o perfil é escolhido em blocos. */
export function FormNovoUsuario() {
  const [estado, acao, enviando] = useActionState(criarUsuario, ESTADO_INICIAL);
  return (
    <form
      id="novo-usuario"
      action={acao}
      className="superficie-destaque flex scroll-mt-20 flex-col gap-4 rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-6"
    >
      <div className="flex items-center gap-3">
        <SeloIcone nome="mais" tom="ouro" />
        <div>
          <h2 className="text-lg leading-tight font-bold">Cadastrar usuário</h2>
          <p className="text-apagado text-sm">A senha temporária aparece aqui</p>
        </div>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.senhaTemporaria && (
        <SenhaTemporaria senha={estado.senhaTemporaria} email={estado.email} />
      )}
      <Campo
        rotulo="Nome"
        id="nome"
        icone="pessoa"
        required
        minLength={2}
        maxLength={120}
        autoComplete="off"
      />
      <Campo
        rotulo="E-mail"
        id="email"
        icone="email"
        type="email"
        required
        maxLength={254}
        autoComplete="off"
      />
      <OpcoesEmBlocos
        nome="perfil"
        idBase="perfil-novo"
        legenda="Perfil"
        obrigatorio
        colunas="grid-cols-1"
        opcoes={PERFIS_EM_BLOCOS.map((p) => ({ ...p }))}
      />
      <BotaoEnviar
        enviando={enviando}
        textoEnviando="Cadastrando..."
        className={`${classeBotao} w-full`}
      >
        Cadastrar
      </BotaoEnviar>
    </form>
  );
}
