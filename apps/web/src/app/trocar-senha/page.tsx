import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Marca } from "@/components/layout/marca";
import { Aviso, classeCartao } from "@/components/ui";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { FormTrocaSenha } from "./form-troca";

export const metadata: Metadata = { title: "Trocar senha | Só Dois Toques" };

export default async function PaginaTrocarSenha() {
  await connection();
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Marca />
      <header>
        <h1 className="text-2xl font-bold">Trocar senha</h1>
        <p className="text-suave mt-1">{usuario.nome}</p>
      </header>
      {usuario.trocarSenha ? (
        <Aviso tipo="info">
          Você entrou com uma senha temporária. Defina uma senha nova para continuar.
        </Aviso>
      ) : (
        <p className="text-suave text-sm">Ao trocar a senha, você sai dos outros aparelhos.</p>
      )}
      <div className={classeCartao}>
        <FormTrocaSenha />
      </div>
      {!usuario.trocarSenha && (
        <Link href="/" className="text-center underline">
          Voltar
        </Link>
      )}
    </main>
  );
}
