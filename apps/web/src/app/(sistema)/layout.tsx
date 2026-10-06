import Link from "next/link";
import { sair } from "@/app/acoes/sessao";
import { PERFIS, itensDoMenu } from "@/lib/acesso/areas";
import { exigirUsuario } from "@/lib/servidor/sessao";

export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const menu = itensDoMenu(usuario.areas);
  return (
    <>
      <header className="border-b border-current/15">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="text-lg font-semibold">
            Só Dois Toques
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {usuario.nome} <span className="opacity-70">({PERFIS[usuario.perfil]})</span>
            </span>
            <Link href="/trocar-senha" className="underline">
              Trocar senha
            </Link>
            <form action={sair}>
              <button type="submit" className="underline">
                Sair
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Menu principal" className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2">
            {menu.map((item) => (
              <li key={item.area}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-current/10"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        {children}
      </main>
    </>
  );
}
