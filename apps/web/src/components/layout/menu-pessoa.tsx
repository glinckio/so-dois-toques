import Link from "next/link";
import { sair } from "@/app/acoes/sessao";
import { Avatar } from "@/components/base/avatar";
import { Selo } from "@/components/base/selo";
import { Icone } from "@/components/icones";

/**
 * VIVO-CA-05: menu da pessoa, aberto pelo avatar (popover nativo, sem JavaScript).
 * No celular desce do canto de cima; no computador sobe do cartão do rodapé do menu.
 */
export function MenuDaPessoa({ nome, perfil }: { nome: string; perfil: string }) {
  const item =
    "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-semibold text-suave transition-colors hover:bg-elevado hover:text-texto";
  return (
    <div
      id="menu-pessoa"
      popover="auto"
      aria-label="Menu da pessoa"
      className="vidro open:animate-surgir top-[4.25rem] right-3 bottom-auto left-auto m-0 w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.5rem] p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0_/_0.95)] lg:top-auto lg:right-auto lg:bottom-[6.5rem] lg:left-8"
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-4">
        <Avatar nome={nome} tamanho="g" />
        <div className="min-w-0">
          <p className="truncate font-bold" data-testid="nome-da-pessoa">
            {nome}
          </p>
          <Selo tom="roxo" className="mt-1">
            {perfil}
          </Selo>
        </div>
      </div>
      <div className="border-borda flex flex-col gap-1 border-t pt-2">
        <Link href="/trocar-senha" className={item}>
          <Icone nome="chave" width={18} height={18} />
          Trocar senha
        </Link>
        <form action={sair}>
          <button type="submit" className={`${item} hover:text-perigo`}>
            <Icone nome="sair" width={18} height={18} />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

/** Cartão da pessoa no rodapé do menu lateral; abre o menu da pessoa. */
export function CartaoDaPessoa({ nome, perfil }: { nome: string; perfil: string }) {
  return (
    <button
      type="button"
      popoverTarget="menu-pessoa"
      className="border-borda bg-elevado/50 hover:border-roxo/40 hover:bg-elevado flex w-full items-center gap-3 rounded-[1.25rem] border p-2.5 text-left transition-colors"
    >
      <Avatar nome={nome} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{nome}</span>
        <span className="text-apagado block text-xs">{perfil}</span>
      </span>
      <Icone nome="abaixo" width={16} height={16} className="text-apagado rotate-180" />
      <span className="sr-only">Abrir o menu da pessoa</span>
    </button>
  );
}

/** Avatar da barra do topo no celular; abre o menu da pessoa. */
export function AvatarDoTopo({ nome }: { nome: string }) {
  return (
    <button
      type="button"
      popoverTarget="menu-pessoa"
      className="ring-borda hover:ring-roxo/60 rounded-full ring-2 transition"
    >
      <Avatar nome={nome} />
      <span className="sr-only">Abrir o menu da pessoa</span>
    </button>
  );
}
