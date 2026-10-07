"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { linkAtivo } from "@/lib/acesso/areas";

/**
 * Pílula que desliza até o item marcado (`aria-current`) de uma lista. A posição é
 * medida no navegador e aplicada pelo CSSOM (a CSP não deixa estilo no HTML); antes
 * disso, o próprio item marcado mostra o fundo.
 */
export function usePilula(chave: unknown) {
  const lista = useRef<HTMLUListElement>(null);
  const pilula = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const ul = lista.current;
    const p = pilula.current;
    if (!ul || !p) return;
    const posicionar = () => {
      const ativo = ul.querySelector<HTMLElement>('[aria-current="page"]');
      if (!ativo) {
        p.style.opacity = "0";
        return;
      }
      // Soma as posições até chegar à lista: um item com `relative` no caminho vira o
      // offsetParent e zeraria a conta. offsetLeft ignora transformações (cascata).
      let x = 0;
      let y = 0;
      for (let el: Element | null = ativo; el && el !== ul;) {
        const caixa = el as HTMLElement;
        x += caixa.offsetLeft;
        y += caixa.offsetTop;
        el = caixa.offsetParent;
      }
      p.style.width = `${ativo.offsetWidth}px`;
      p.style.height = `${ativo.offsetHeight}px`;
      p.style.transform = `translate(${x}px, ${y}px)`;
      p.style.opacity = "1";
      // Primeiro posiciona sem animar; depois, cada troca desliza.
      requestAnimationFrame(() => {
        ul.dataset.pronto = "1";
      });
    };
    posicionar();
    const observador = new ResizeObserver(posicionar);
    observador.observe(ul);
    return () => observador.disconnect();
  }, [chave]);
  return { lista, pilula };
}

/** Menu interno de uma área, em abas de pílula; a aba da página aberta fica marcada (VIS-CA-02). */
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
  const { lista, pilula } = usePilula(ativo);
  return (
    <nav
      aria-label={rotulo}
      className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul
        ref={lista}
        className="group/abas superficie relative inline-flex gap-1 rounded-full p-1.5"
      >
        <span
          ref={pilula}
          aria-hidden="true"
          className="bg-ouro group-data-pronto/abas:ease-mola pointer-events-none absolute top-0 left-0 rounded-full opacity-0 shadow-[0_8px_24px_-10px_rgb(233_171_2_/_0.9)] group-data-pronto/abas:transition-[transform,width,opacity] group-data-pronto/abas:duration-500"
        />
        {links.map((l) => {
          const atual = l.href === ativo;
          return (
            <li key={l.href} className="relative shrink-0">
              <Link
                href={l.href}
                aria-current={atual ? "page" : undefined}
                className={`relative z-10 flex min-h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
                  atual
                    ? "text-fundo bg-ouro group-data-pronto/abas:bg-transparent"
                    : "text-suave hover:text-texto"
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
