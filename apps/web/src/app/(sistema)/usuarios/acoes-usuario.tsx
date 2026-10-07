"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { alterarPerfil, desativarUsuario, redefinirSenha } from "@/app/acoes/usuarios";
import { Carregando } from "@/components/base/bola";
import { JanelaDeConfirmacao, useConfirmacao } from "@/components/base/confirmacao";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoPerigo, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { PERFIS, type Perfil } from "@/lib/acesso/areas";
import { SenhaTemporaria } from "./senha-temporaria";

const botao = `${classeBotaoSecundario} min-h-11 px-4 text-sm`;

export function AcoesUsuario({ id, nome, perfil }: { id: string; nome: string; perfil: Perfil }) {
  const [estadoPerfil, acaoPerfil, alterando] = useActionState(alterarPerfil, ESTADO_INICIAL);
  const [estadoSenha, acaoSenha, gerando] = useActionState(redefinirSenha, ESTADO_INICIAL);
  const [estadoDesativar, acaoDesativar, desativando] = useActionState(
    desativarUsuario,
    ESTADO_INICIAL,
  );
  const desativar = useConfirmacao(true);
  const erro = estadoPerfil.erro ?? estadoSenha.erro ?? estadoDesativar.erro;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={acaoPerfil} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="sr-only" htmlFor={`perfil-${id}`}>
            Perfil de {nome}
          </label>
          <select
            id={`perfil-${id}`}
            name="perfil"
            defaultValue={perfil}
            className={`${classeCampo} min-h-11 w-auto py-0 text-sm`}
          >
            {Object.entries(PERFIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <button type="submit" className={botao} disabled={alterando} aria-busy={alterando}>
            {alterando ? <Carregando /> : <Icone nome="repetir" width={16} height={16} />}
            Alterar perfil
          </button>
        </form>
        <form action={acaoSenha}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={botao} disabled={gerando} aria-busy={gerando}>
            {gerando ? <Carregando /> : <Icone nome="chave" width={16} height={16} />}
            Nova senha temporária
          </button>
        </form>
        <form action={acaoDesativar} onSubmit={desativar.aoEnviar} className="sm:ml-auto">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className={`${classeBotaoPerigo} min-h-11 px-4 text-sm`}
            disabled={desativando}
            aria-busy={desativando}
          >
            {desativando ? <Carregando /> : <Icone nome="bloqueio" width={16} height={16} />}
            Desativar
          </button>
          <JanelaDeConfirmacao
            janela={desativar.janela}
            titulo={`Desativar ${nome}?`}
            mensagem="A pessoa sai do sistema na hora e não consegue mais entrar."
            aoConfirmar={desativar.confirmar}
          />
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
