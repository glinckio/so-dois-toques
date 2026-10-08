import type { Metadata } from "next";
import { connection } from "next/server";
import { Avatar } from "@/components/base/avatar";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo, SeloIcone, type Tom } from "@/components/base/selo";
import { Icone, type NomeIcone } from "@/components/icones";
import { AcessoNegado, Aviso, classeBotao } from "@/components/ui";
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

const ESTILO_DO_PERFIL: Record<Perfil, { tom: Tom; icone: NomeIcone; plural: string }> = {
  ADMINISTRADOR: { tom: "roxo", icone: "escudo", plural: "Administradores" },
  PROFESSOR: { tom: "ouro", icone: "aulas", plural: "Professores" },
  ATENDENTE: { tom: "areia", icone: "caixa", plural: "Atendentes" },
};

/** Equipe: cartões com avatar, perfil e situação; cadastro num cartão próprio ao lado. */
export default async function PaginaUsuarios() {
  await connection();
  const { usuario: eu, permitido } = await exigirArea("usuarios");
  if (!permitido) return <AcessoNegado />;
  const resposta = await chamarApi<UsuarioLista[]>("/usuarios");
  const ativos = resposta.ok ? resposta.dados.filter((u) => u.ativo) : [];

  return (
    <>
      <Cabecalho
        etiqueta="Gestão"
        icone="usuarios"
        titulo={
          <>
            Usuários e <Destaque>acessos</Destaque>
          </>
        }
        descricao="Quem entra no sistema e o que cada perfil pode ver. Cada pessoa tem o próprio login."
        acoes={
          // No celular o cadastro fica depois da lista; o atalho leva direto a ele.
          <a href="#novo-usuario" className={`${classeBotao} lg:hidden`}>
            <Icone nome="mais" width={18} height={18} />
            Novo usuário
          </a>
        }
      />
      {resposta.ok && (
        <ul className="grid grid-cols-3 gap-3" aria-label="Resumo da equipe">
          {(Object.keys(PERFIS) as Perfil[]).map((perfil) => {
            const quantos = ativos.filter((u) => u.perfil === perfil).length;
            return (
              <li
                key={perfil}
                className="superficie flex flex-col gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center"
              >
                <SeloIcone
                  nome={ESTILO_DO_PERFIL[perfil].icone}
                  tom={ESTILO_DO_PERFIL[perfil].tom}
                />
                <span className="flex flex-col">
                  <span className="text-2xl leading-none font-extrabold tabular-nums">
                    {quantos}
                  </span>
                  <span className="text-apagado text-xs font-semibold sm:text-sm">
                    {ESTILO_DO_PERFIL[perfil].plural}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {!resposta.ok ? (
          <Aviso tipo="erro">{resposta.mensagem}</Aviso>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Lista de usuários">
            {resposta.dados.map((u, i) => (
              <li
                key={u.id}
                className={`superficie animate-entrar flex flex-col gap-4 rounded-[1.6rem] p-4 sm:p-5 atraso-${Math.min(24, i)} ${u.ativo ? "" : "opacity-60"}`}
              >
                <div className="flex items-start gap-3.5">
                  <Avatar nome={u.nome} tamanho="g" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <span className="truncate">{u.nome}</span>
                      {u.id === eu.id && (
                        <span className="text-apagado text-sm font-normal">(você)</span>
                      )}
                    </p>
                    <p className="text-suave truncate text-sm">{u.email}</p>
                    <p className="flex flex-wrap gap-1.5">
                      <Selo tom={ESTILO_DO_PERFIL[u.perfil].tom} semPonto>
                        {PERFIS[u.perfil]}
                      </Selo>
                      {u.ativo ? (
                        u.trocarSenha ? (
                          <Selo tom="ouro" pulsar>
                            aguardando primeira senha
                          </Selo>
                        ) : (
                          <Selo tom="sucesso">ativo</Selo>
                        )
                      ) : (
                        <Selo tom="neutro">desativado</Selo>
                      )}
                    </p>
                  </div>
                </div>
                {u.ativo && (
                  <div className="border-borda border-t pt-4">
                    <AcoesUsuario id={u.id} nome={u.nome} perfil={u.perfil} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <FormNovoUsuario />
      </div>
    </>
  );
}
