"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { alterarPerfil, desativarUsuario, redefinirSenha } from "@/app/acoes/usuarios";
import { Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { PERFIS, type Perfil } from "@/lib/acesso/areas";
import { SenhaTemporaria } from "./senha-temporaria";

export function AcoesUsuario({ id, nome, perfil }: { id: string; nome: string; perfil: Perfil }) {
  const [estadoPerfil, acaoPerfil, alterando] = useActionState(alterarPerfil, ESTADO_INICIAL);
  const [estadoSenha, acaoSenha, gerando] = useActionState(redefinirSenha, ESTADO_INICIAL);
  const [estadoDesativar, acaoDesativar, desativando] = useActionState(
    desativarUsuario,
    ESTADO_INICIAL,
  );
  const erro = estadoPerfil.erro ?? estadoSenha.erro ?? estadoDesativar.erro;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <form action={acaoPerfil} className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="sr-only" htmlFor={`perfil-${id}`}>
            Perfil de {nome}
          </label>
          <select
            id={`perfil-${id}`}
            name="perfil"
            defaultValue={perfil}
            className={`${classeCampo} w-auto`}
          >
            {Object.entries(PERFIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <button type="submit" className={classeBotaoSecundario} disabled={alterando}>
            Alterar perfil
          </button>
        </form>
        <form action={acaoSenha}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={classeBotaoSecundario} disabled={gerando}>
            Nova senha temporária
          </button>
        </form>
        <form
          action={acaoDesativar}
          onSubmit={(evento) => {
            if (!window.confirm(`Desativar ${nome}? A pessoa sai do sistema na hora.`))
              evento.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={classeBotaoSecundario} disabled={desativando}>
            Desativar
          </button>
        </form>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {estadoPerfil.sucesso && !estadoPerfil.erro && (
        <Aviso tipo="sucesso">{estadoPerfil.sucesso}</Aviso>
      )}
      {estadoSenha.senhaTemporaria && <SenhaTemporaria senha={estadoSenha.senhaTemporaria} />}
    </div>
  );
}
