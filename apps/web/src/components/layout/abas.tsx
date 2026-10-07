"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { linkAtivo } from "@/lib/acesso/areas";

/** Menu interno de uma área, em abas; a aba da página aberta fica marcada (VIS-CA-02). */
export function Abas({
  rotulo,
  links,
}: {
  rotulo: string;
  links: { href: string; rotulo: string }[];
}) {
  const caminho = usePathname();
  const ativo = linkAtivo(
    caminho,
    links.map((l) => l.href),
  );
  return (
    <nav aria-label={rotulo} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="border-borda bg-cartao inline-flex gap-1 rounded-full border p-1">
        {links.map((l) => {
          const atual = l.href === ativo;
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={atual ? "page" : undefined}
                className={`flex min-h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  atual ? "bg-ouro text-fundo" : "text-suave hover:bg-elevado hover:text-texto"
                }`}
              >
                {l.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
