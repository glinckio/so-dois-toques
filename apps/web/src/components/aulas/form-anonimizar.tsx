"use client";

import { useActionState } from "react";
import { anonimizarAluno } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { BotaoEnviar } from "@/components/base/enviar";
import { SeloIcone } from "@/components/base/selo";
import { Aviso, Campo, classeBotaoPerigo } from "@/components/ui";

/** AULAS-CA-08: ação sem volta, confirmada digitando ANONIMIZAR. */
export function FormAnonimizar({ id }: { id: string }) {
  const [estado, acao, enviando] = useActionState(anonimizarAluno, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      className="border-perigo/35 via-cartao to-cartao relative flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border bg-linear-to-br from-[#2a0f1a] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <SeloIcone nome="escudo" tom="perigo" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg leading-tight font-bold">Anonimizar (pedido do aluno, LGPD)</h2>
          <p className="text-suave text-sm">
            Apaga nome, telefones, e-mail, nascimento, responsável e observações e encerra as
            matrículas. As presenças continuam contando, sem identificar a pessoa. Não dá para
            desfazer.
          </p>
        </div>
      </div>
      <input type="hidden" name="id" value={id} />
      <Campo
        rotulo="Digite ANONIMIZAR para confirmar"
        id="confirmacao"
        icone="cadeado"
        autoComplete="off"
        required
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <div>
        <BotaoEnviar enviando={enviando} className={classeBotaoPerigo}>
          Anonimizar aluno
        </BotaoEnviar>
      </div>
    </form>
  );
}
