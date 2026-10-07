"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { criarUsuario } from "@/app/acoes/usuarios";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { PERFIS } from "@/lib/acesso/areas";
import { SenhaTemporaria } from "./senha-temporaria";

export function FormNovoUsuario() {
  const [estado, acao, enviando] = useActionState(criarUsuario, ESTADO_INICIAL);
  return (
    <form
      action={acao}
      className="border-borda bg-cartao flex flex-col gap-4 rounded-2xl border p-4"
    >
      <h2 className="text-lg font-medium">Cadastrar usuário</h2>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.senhaTemporaria && (
        <SenhaTemporaria senha={estado.senhaTemporaria} email={estado.email} />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Nome" id="nome" required minLength={2} maxLength={120} autoComplete="off" />
        <Campo
          rotulo="E-mail"
          id="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="perfil" className="text-sm font-medium">
            Perfil
          </label>
          <select id="perfil" name="perfil" required className={classeCampo} defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {Object.entries(PERFIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}
