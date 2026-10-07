"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icone, type NomeIcone } from "@/components/icones";
import { GRUPOS_DO_MENU, linkAtivo, separarMenuDoCelular, type Area } from "@/lib/acesso/areas";
import { usePilula } from "./abas";

type Item = { area: Area; rotulo: string; href: string };

function useAtivo(itens: Item[]) {
  const caminho = usePathname();
  return linkAtivo(
    caminho,
    itens.map((i) => i.href),
  );
}

/**
 * VIS-CA-02 e VIVO-CA-02: menu lateral do computador, com as áreas em grupos e a
 * pílula roxa deslizando até a área aberta.
 */
export function MenuLateral({ itens }: { itens: Item[] }) {
  const ativo = useAtivo(itens);
  const { lista, pilula } = usePilula(ativo);
  const grupos = GRUPOS_DO_MENU.map((g) => ({
    ...g,
    itens: itens.filter((i) => g.areas.includes(i.area)),
  })).filter((g) => g.itens.length > 0);
  return (
    <nav aria-label="Menu principal" className="max-lg:hidden">
      <ul ref={lista} className="group/menu relative flex flex-col gap-5">
        <span
          ref={pilula}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-2xl bg-linear-to-r from-[#7c3aed] to-[#9b5cf6] opacity-0 shadow-[0_12px_30px_-12px_rgb(124_58_237_/_0.95)] group-data-pronto/menu:transition-[transform,width,height,opacity] group-data-pronto/menu:duration-500 group-data-pronto/menu:ease-mola"
        />
        {grupos.map((grupo) => (
          <li key={grupo.rotulo} className="flex flex-col gap-1">
            <p className="text-apagado px-3 pb-1 text-[0.68rem] font-bold tracking-[0.16em] uppercase">
              {grupo.rotulo}
            </p>
            <ul className="flex flex-col gap-1">
              {grupo.itens.map((item) => {
                const atual = item.href === ativo;
                return (
                  <li key={item.area}>
                    <Link
                      href={item.href}
                      aria-current={atual ? "page" : undefined}
                      className={`group/item relative z-10 flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[0.95rem] font-semibold transition-colors duration-300 ${
                        atual
                          ? "bg-roxo-forte text-white group-data-pronto/menu:bg-transparent"
                          : "text-suave hover:bg-elevado/70 hover:text-texto"
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-xl transition-colors ${atual ? "bg-white/15" : "bg-elevado/70 group-hover/item:bg-elevado"}`}
                      >
                        <Icone nome={item.area as NomeIcone} width={18} height={18} />
                      </span>
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * VIVO-CA-02: no celular, barra de abas flutuante embaixo, com até quatro áreas e
 * "Mais" abrindo uma folha com as restantes.
 */
export function MenuInferior({ itens }: { itens: Item[] }) {
  const ativo = useAtivo(itens);
  const { barra, mais } = separarMenuDoCelular(itens);
  const folha = useRef<HTMLDivElement>(null);
  const ativoEmMais = mais.some((i) => i.href === ativo);
  const fecharFolha = () => folha.current?.hidePopover();

  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden print:hidden"
    >
      <ul className="vidro mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-[1.75rem] p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0_/_0.9)]">
        {barra.map((item) => {
          const atual = item.href === ativo;
          return (
            <li key={item.area} className="flex-1">
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[0.7rem] font-semibold transition-all duration-300 active:scale-95 ${
                  atual
                    ? "bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_8px_20px_-8px_rgb(124_58_237_/_0.9)]"
                    : "text-apagado hover:text-texto"
                }`}
              >
                <Icone nome={item.area as NomeIcone} width={21} height={21} />
                {item.rotulo}
              </Link>
            </li>
          );
        })}
        {mais.length > 0 && (
          <li className="flex-1">
            <button
              type="button"
              popoverTarget="menu-mais"
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[0.7rem] font-semibold transition-all duration-300 active:scale-95 ${
                ativoEmMais ? "bg-roxo-forte/25 text-roxo-claro" : "text-apagado hover:text-texto"
              }`}
            >
              <Icone nome="grade" width={21} height={21} />
              Mais
            </button>
          </li>
        )}
      </ul>
      {mais.length > 0 && (
        <div
          ref={folha}
          id="menu-mais"
          popover="auto"
          className="vidro open:animate-subir-folha inset-x-3 top-auto bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] m-0 mx-auto w-auto max-w-md rounded-[1.75rem] p-3 shadow-[0_30px_60px_-20px_rgb(0_0_0_/_0.95)]"
        >
          <p className="text-apagado px-2 pt-1 pb-2 text-[0.68rem] font-bold tracking-[0.16em] uppercase">
            Mais áreas
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {mais.map((item) => {
              const atual = item.href === ativo;
              return (
                <li key={item.area}>
                  <Link
                    href={item.href}
                    onClick={fecharFolha}
                    aria-current={atual ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 font-semibold transition-colors ${
                      atual ? "bg-roxo-forte text-white" : "bg-elevado/60 hover:bg-elevado"
                    }`}
                  >
                    <Icone nome={item.area as NomeIcone} width={20} height={20} />
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
