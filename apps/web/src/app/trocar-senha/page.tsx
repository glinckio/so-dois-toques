import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/base/avatar";
import { Icone } from "@/components/icones";
import { Marca } from "@/components/layout/marca";
import { Aviso, classeBotaoFantasma } from "@/components/ui";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { FormTrocaSenha } from "./form-troca";

export const metadata: Metadata = { title: "Trocar senha | Só Dois Toques" };

export default async function PaginaTrocarSenha() {
  await connection();
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });
  return (
    <main className="animate-entrar mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Marca />
      <div className="vidro relative flex flex-col gap-6 overflow-hidden rounded-[2rem] p-6 shadow-[0_40px_80px_-40px_rgb(124_58_237_/_0.6)] sm:p-8">
        <span className="bg-roxo/25 absolute -top-16 -right-16 size-48 rounded-full blur-3xl" aria-hidden="true" />
        <header className="relative flex items-center gap-4">
          <span className="from-roxo/40 to-ouro/20 text-roxo-claro grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br">
            <Icone nome="escudo" width={26} height={26} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">Trocar senha</h1>
            <p className="text-suave mt-0.5 flex items-center gap-2 text-sm">
              <Avatar nome={usuario.nome} tamanho="p" />
              <span className="truncate">{usuario.nome}</span>
            </p>
          </div>
        </header>
        {usuario.trocarSenha ? (
          <Aviso tipo="info">
            Você entrou com uma senha temporária. Defina uma senha nova para continuar.
          </Aviso>
        ) : (
          <p className="text-suave relative text-sm">Ao trocar a senha, você sai dos outros aparelhos.</p>
        )}
        <FormTrocaSenha />
      </div>
      {!usuario.trocarSenha && (
        <Link href="/" className={`${classeBotaoFantasma} self-center`}>
          <Icone nome="voltar" width={18} height={18} />
          Voltar
        </Link>
      )}
    </main>
  );
}
