import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso } from "@/components/ui";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar | Só Dois Toques" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  await connection();
  const { expirada } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold">Só Dois Toques</h1>
        <p className="mt-1 opacity-80">Entre com seu e-mail e senha.</p>
      </header>
      {expirada && <Aviso tipo="info">Sua sessão expirou. Entre novamente.</Aviso>}
      <FormLogin />
    </main>
  );
}
