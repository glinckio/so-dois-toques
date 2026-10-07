import type { Metadata } from "next";
import { connection } from "next/server";
import { Aviso, classeCartao } from "@/components/ui";
import logo from "../../../public/marca/logo-256.png";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar | Só Dois Toques" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  await connection();
  const { expirada } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        {/* next/image põe estilo embutido (color: transparent), barrado pela CSP. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt="Logo do Só Dois Toques"
          width={128}
          height={128}
          className="shadow-roxo-forte/50 ring-roxo/40 size-32 rounded-full shadow-2xl ring-2"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Só Dois Toques</h1>
          <p className="text-suave mt-1">Entre com seu e-mail e senha.</p>
        </div>
      </header>
      <div className={`${classeCartao} flex flex-col gap-4 shadow-2xl shadow-black/40`}>
        {expirada && <Aviso tipo="info">Sua sessão expirou. Entre novamente.</Aviso>}
        <FormLogin />
      </div>
      <p className="text-apagado text-center text-xs">São Leopoldo · RS</p>
    </main>
  );
}
