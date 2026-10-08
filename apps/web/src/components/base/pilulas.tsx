"use client";

import Link from "next/link";
import { usePilula } from "@/components/layout/abas";

/**
 * Filtros em pílula (mês, situação): links em que o escolhido fica marcado e a
 * pílula roxa desliza até ele.
 */
export function PilulasDeLinks({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: readonly { href: string; rotulo: string; atual: boolean }[];
}) {
  const ativo = itens.find((i) => i.atual)?.href;
  const { lista, pilula } = usePilula(ativo);
  return (
    <nav aria-label={rotulo} className="-mx-1 [scrollbar-width:none] overflow-x-auto px-1">
      <ul
        ref={lista}
        className="group/pilulas border-borda bg-noite/40 relative inline-flex gap-1 rounded-full border p-1"
      >
        <span
          ref={pilula}
          aria-hidden="true"
          className="group-data-pronto/pilulas:ease-mola pointer-events-none absolute top-0 left-0 rounded-full bg-linear-to-b from-[#8448f0] to-[#6d28d9] opacity-0 shadow-[0_8px_22px_-10px_rgb(124_58_237_/_0.95)] group-data-pronto/pilulas:transition-[transform,width,opacity] group-data-pronto/pilulas:duration-500"
        />
        {itens.map((item) => (
          <li key={item.href} className="relative shrink-0">
            <Link
              href={item.href}
              aria-current={item.atual ? "page" : undefined}
              className={`relative z-10 flex min-h-11 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
                item.atual
                  ? "bg-roxo-forte text-white group-data-pronto/pilulas:bg-transparent"
                  : "text-suave hover:text-texto"
              }`}
            >
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
