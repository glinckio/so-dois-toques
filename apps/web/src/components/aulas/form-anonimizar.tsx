"use client";

import { useActionState } from "react";
import { anonimizarAluno } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotaoSecundario } from "@/components/ui";

/** AULAS-CA-08: ação sem volta, confirmada digitando ANONIMIZAR. */
export function FormAnonimizar({ id }: { id: string }) {
  const [estado, acao, enviando] = useActionState(anonimizarAluno, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-3 rounded-lg border border-red-600/40 p-4">
      <h2 className="font-medium">Anonimizar (pedido do aluno, LGPD)</h2>
      <p className="text-sm opacity-80">
        Apaga nome, telefones, e-mail, nascimento, responsável e observações e encerra as
        matrículas. As presenças continuam contando, sem identificar a pessoa. Não dá para desfazer.
      </p>
      <input type="hidden" name="id" value={id} />
      <Campo
        rotulo="Digite ANONIMIZAR para confirmar"
        id="confirmacao"
        autoComplete="off"
        required
      />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button type="submit" className={`${classeBotaoSecundario} self-start`} disabled={enviando}>
        Anonimizar aluno
      </button>
    </form>
  );
}
