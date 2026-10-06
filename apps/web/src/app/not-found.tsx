import Link from "next/link";
import { connection } from "next/server";

export default async function NotFound() {
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link href="/" className="underline">
        Voltar para o início
      </Link>
    </main>
  );
}
