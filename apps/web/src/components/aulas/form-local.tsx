"use client";

import { useActionState } from "react";
import { criarLocal } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { TIPOS_LOCAL } from "@/lib/aulas/formatacao";

export function FormLocal() {
  const [estado, acao, enviando] = useActionState(criarLocal, ESTADO_INICIAL);
  return (
    <form action={acao} className="flex flex-col gap-4 rounded-lg border border-current/15 p-4">
      <h2 className="text-lg font-medium">Cadastrar local</h2>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome do local" id="nome" required minLength={2} maxLength={80} />
        <div className="flex flex-col gap-1">
          <label htmlFor="tipo" className="text-sm font-medium">
            Tipo
          </label>
          <select id="tipo" name="tipo" className={classeCampo} defaultValue="PARCEIRA">
            {Object.entries(TIPOS_LOCAL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <Campo rotulo="Endereço (opcional)" id="endereco" maxLength={200} />
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        Cadastrar
      </button>
    </form>
  );
}
