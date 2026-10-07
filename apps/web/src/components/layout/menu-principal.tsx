"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "@/components/icones";
import { linkAtivo, type Area } from "@/lib/acesso/areas";

type Item = { area: Area; rotulo: string; href: string };

/**
 * VIS-CA-02: um só menu principal. No computador fica na coluna lateral, em
 * lista; no celular vira uma faixa que desliza na horizontal.
 */
export function MenuPrincipal({ itens }: { itens: Item[] }) {
  const caminho = usePathname();
  const ativo = linkAtivo(
    caminho,
    itens.map((i) => i.href),
  );
  return (
    <nav aria-label="Menu principal" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1.5 pb-1 lg:flex-col lg:gap-1 lg:pb-0">
        {itens.map((item) => {
          const atual = item.href === ativo;
          return (
            <li key={item.area} className="shrink-0">
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:min-h-11 lg:rounded-xl lg:px-3 ${
                  atual
                    ? "bg-roxo-forte shadow-roxo-forte/30 text-white shadow-lg"
                    : "text-suave hover:bg-elevado hover:text-texto"
                }`}
              >
                <Icone nome={item.area as NomeIcone} className="shrink-0" />
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
