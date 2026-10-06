import type { Metadata } from "next";
import { connection } from "next/server";
import { AcessoNegado, Aviso } from "@/components/ui";
import { PERFIS, type Perfil } from "@/lib/acesso/areas";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";
import { AcoesUsuario } from "./acoes-usuario";
import { FormNovoUsuario } from "./form-novo-usuario";

export const metadata: Metadata = { title: "Usuários | Só Dois Toques" };

type UsuarioLista = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  trocarSenha: boolean;
};

export default async function PaginaUsuarios() {
  await connection();
  const { usuario: eu, permitido } = await exigirArea("usuarios");
  if (!permitido) return <AcessoNegado />;
  const resposta = await chamarApi<UsuarioLista[]>("/usuarios");

  return (
    <>
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <FormNovoUsuario />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Lista de usuários">
          {resposta.dados.map((u) => (
            <li
              key={u.id}
              className={`flex flex-col gap-3 rounded-lg border border-current/15 p-4 ${u.ativo ? "" : "opacity-60"}`}
            >
              <div>
                <p className="font-medium">
                  {u.nome} {u.id === eu.id && <span className="text-sm opacity-70">(você)</span>}
                </p>
                <p className="text-sm opacity-80">
                  {u.email} · {PERFIS[u.perfil]} ·{" "}
                  {u.ativo ? (u.trocarSenha ? "aguardando primeira senha" : "ativo") : "desativado"}
                </p>
              </div>
              {u.ativo && <AcoesUsuario id={u.id} nome={u.nome} perfil={u.perfil} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
