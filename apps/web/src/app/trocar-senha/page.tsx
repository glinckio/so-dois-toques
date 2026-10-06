import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso } from "@/components/ui";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { FormTrocaSenha } from "./form-troca";

export const metadata: Metadata = { title: "Trocar senha | Só Dois Toques" };

export default async function PaginaTrocarSenha() {
  await connection();
  const usuario = await exigirUsuario({ permitirTrocaPendente: true });
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Trocar senha</h1>
        <p className="mt-1 opacity-80">{usuario.nome}</p>
      </header>
      {usuario.trocarSenha ? (
        <Aviso tipo="info">
          Você entrou com uma senha temporária. Defina uma senha nova para continuar.
        </Aviso>
      ) : (
        <p className="text-sm opacity-80">Ao trocar a senha, você sai dos outros aparelhos.</p>
      )}
      <FormTrocaSenha />
      {!usuario.trocarSenha && (
        <Link href="/" className="text-center underline">
          Voltar
        </Link>
      )}
    </main>
  );
}
