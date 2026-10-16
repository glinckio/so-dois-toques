"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { alterarQuadra, criarQuadra } from "@/app/acoes/horarios";
import { BotaoEnviar } from "@/components/base/enviar";
import { Aviso, Campo, classeBotao, classeBotaoSecundario } from "@/components/ui";
import type { Quadra } from "@/lib/horarios/tipos";

/** GASTO-CA-01: nome e situação de uma quadra (só o administrador muda). */
export function FormQuadra({ quadra }: { quadra: Quadra }) {
  const [estado, acao, enviando] = useActionState(alterarQuadra, ESTADO_INICIAL);
  const campo = `quadra-${quadra.id}`;
  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label={`Quadra ${quadra.nome}`}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="quadraId" value={quadra.id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <Campo
            rotulo="Nome da quadra"
            id={`${campo}-nome`}
            name="nome"
            icone="areia"
            required
            minLength={2}
            maxLength={40}
            defaultValue={estado.valores?.["nome"] ?? quadra.nome}
          />
        </div>
        <label
          htmlFor={`${campo}-ativa`}
          className="border-borda bg-elevado/40 flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-4 text-sm font-semibold"
        >
          <input
            id={`${campo}-ativa`}
            type="checkbox"
            name="ativa"
            defaultChecked={quadra.ativa}
            className="accent-roxo size-4"
          />
          Ativa
        </label>
        <BotaoEnviar enviando={enviando} className={classeBotaoSecundario}>
          Salvar
        </BotaoEnviar>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}

/** GASTO-CA-01: cadastro de quadra alugada. */
export function FormNovaQuadra() {
  const [estado, acao, enviando] = useActionState(criarQuadra, ESTADO_INICIAL);
  return (
    <form
      key={estado.sucesso ?? JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Nova quadra"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grow">
          <Campo
            rotulo="Nome da nova quadra"
            id="nova-quadra"
            name="nome"
            icone="areia"
            required
            minLength={2}
            maxLength={40}
            placeholder="Arena Beira-Rio, quadra 2"
            defaultValue={estado.valores?.["nome"] ?? ""}
          />
        </div>
        <BotaoEnviar enviando={enviando} className={classeBotao}>
          Cadastrar quadra
        </BotaoEnviar>
      </div>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
    </form>
  );
}
