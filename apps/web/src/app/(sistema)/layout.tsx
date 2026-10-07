import Link from "next/link";
import { sair } from "@/app/acoes/sessao";
import { Icone } from "@/components/icones";
import { Marca } from "@/components/layout/marca";
import { MenuPrincipal } from "@/components/layout/menu-principal";
import { PERFIS, itensDoMenu } from "@/lib/acesso/areas";
import { exigirUsuario } from "@/lib/servidor/sessao";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return (
    (partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const menu = itensDoMenu(usuario.areas);
  return (
    <div className="min-h-full lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="border-borda bg-fundo/85 lg:bg-cartao/60 sticky top-0 z-30 flex flex-col gap-3 border-b px-4 pt-3 pb-2 backdrop-blur-md lg:h-screen lg:gap-6 lg:border-r lg:border-b-0 lg:px-4 lg:py-6 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-full">
            <Marca />
          </Link>
        </div>
        <MenuPrincipal itens={menu} />
        <div className="hidden lg:mt-auto lg:block">
          <div className="border-borda bg-elevado/60 flex items-center gap-3 rounded-2xl border p-3">
            <span
              className="bg-roxo-forte/30 text-roxo grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold"
              aria-hidden="true"
            >
              {iniciais(usuario.nome)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{usuario.nome}</span>
              <span className="text-apagado block text-xs">{PERFIS[usuario.perfil]}</span>
            </span>
          </div>
        </div>
        <div className="absolute top-3.5 right-3 flex items-center gap-1 text-sm lg:static lg:-mt-3 lg:justify-between">
          <Link
            href="/trocar-senha"
            className="text-suave hover:bg-elevado hover:text-texto flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5"
          >
            <Icone nome="chave" width={16} height={16} />
            <span className="max-lg:sr-only">Trocar senha</span>
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="text-suave hover:bg-elevado hover:text-texto flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5"
            >
              <Icone nome="sair" width={16} height={16} />
              <span className="max-lg:sr-only">Sair</span>
            </button>
          </form>
        </div>
      </aside>
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
