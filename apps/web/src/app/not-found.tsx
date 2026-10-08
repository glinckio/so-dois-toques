import Link from "next/link";
import { connection } from "next/server";
import { BolaBrilhante } from "@/components/base/bola";
import { Destaque } from "@/components/base/cabecalho";
import { Marca } from "@/components/layout/marca";
import { SetaDoBotao, classeBotao } from "@/components/ui";

export default async function NotFound() {
  await connection();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <Marca />
      <BolaBrilhante tamanho={110} className="my-6" />
      <div className="animate-entrar flex flex-col gap-2">
        <p className="text-ouro text-xs font-bold tracking-[0.18em] uppercase">Erro 404</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          <Destaque>Bola fora!</Destaque> Página não encontrada
        </h1>
        <p className="text-suave">O endereço não existe ou mudou de lugar.</p>
      </div>
      <Link href="/" className={classeBotao}>
        Voltar para o início
        <SetaDoBotao />
      </Link>
    </main>
  );
}
