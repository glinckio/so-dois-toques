import Link from "next/link";
import { BotaoBusca, BuscaRapida } from "@/components/layout/busca-rapida";
import { Marca } from "@/components/layout/marca";
import { AvatarDoTopo, CartaoDaPessoa, MenuDaPessoa } from "@/components/layout/menu-pessoa";
import { MenuInferior, MenuLateral } from "@/components/layout/menu-principal";
import { Icone } from "@/components/icones";
import { PERFIS, itensDoMenu } from "@/lib/acesso/areas";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { itensDaBusca } from "@/lib/base/busca";
import { exigirUsuario } from "@/lib/servidor/sessao";

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Moldura do sistema: menu lateral em cartão e área de conteúdo emoldurada no
 * computador; barra do topo e barra de abas embaixo no celular.
 */
export default async function LayoutSistema({ children }: LayoutProps<"/">) {
  const usuario = await exigirUsuario();
  const menu = itensDoMenu(usuario.areas);
  const perfil = PERFIS[usuario.perfil];
  const admin = usuario.perfil === "ADMINISTRADOR";
  const hoje = DATA_CURTA.format(new Date(`${hojeEmSaoPaulo()}T12:00:00Z`)).replace(/\./g, "");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-4 lg:p-4">
      <aside className="superficie sticky top-4 hidden h-[calc(100dvh-2rem)] flex-col gap-7 overflow-y-auto rounded-[2rem] p-4 lg:flex print:hidden">
        <Link href="/" className="rounded-full px-1 pt-1">
          <Marca />
        </Link>
        <MenuLateral itens={menu} />
        <div className="mt-auto flex flex-col gap-3">
          <div className="border-ouro/25 relative overflow-hidden rounded-[1.25rem] border bg-linear-to-br from-[#2b2008] to-transparent p-4">
            <span className="bg-ouro/25 absolute -top-6 -right-6 size-20 rounded-full blur-2xl" aria-hidden="true" />
            <p className="text-ouro flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
              <Icone nome="estrela" width={14} height={14} />
              Atalho
            </p>
            <p className="text-suave mt-1.5 text-sm">
              Aperte <kbd className="text-texto font-semibold">Ctrl K</kbd> para buscar ou abrir
              qualquer área.
            </p>
          </div>
          <CartaoDaPessoa nome={usuario.nome} perfil={perfil} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="vidro sticky top-0 z-30 flex items-center justify-between gap-3 border-x-0 border-t-0 px-4 py-2.5 lg:hidden print:hidden">
          <Link href="/" className="rounded-full">
            <Marca />
          </Link>
          <div className="flex items-center gap-2">
            <BotaoBusca compacto />
            <AvatarDoTopo nome={usuario.nome} />
          </div>
        </header>

        <div className="lg:border-borda/70 lg:bg-fundo/80 flex min-h-full flex-1 flex-col lg:rounded-[2rem] lg:border lg:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]">
          <div className="hidden items-center justify-between gap-4 px-8 pt-6 lg:flex print:hidden">
            <BotaoBusca />
            <span className="superficie text-suave inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold first-letter:uppercase">
              <Icone nome="calendario" width={17} height={17} className="text-ouro" />
              <span className="first-letter:uppercase">{hoje}</span>
            </span>
          </div>
          <main className="mx-auto flex w-full max-w-[84rem] min-w-0 flex-1 flex-col gap-6 px-4 pt-5 pb-32 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10 print:p-0">
            {children}
          </main>
        </div>
      </div>

      <MenuInferior itens={menu} />
      <MenuDaPessoa nome={usuario.nome} perfil={perfil} />
      <BuscaRapida itens={itensDaBusca(usuario.areas, admin)} buscaAlunos={usuario.areas.includes("aulas")} />
    </div>
  );
}
