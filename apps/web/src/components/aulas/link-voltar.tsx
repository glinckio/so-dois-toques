import Link from "next/link";
import type { ReactNode } from "react";
import { Icone } from "@/components/icones";

/** Link discreto para a tela anterior, com a seta que recua ao passar o mouse. */
export function LinkVoltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-suave hover:text-texto group inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold"
    >
      <Icone
        nome="voltar"
        width={16}
        height={16}
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {children}
    </Link>
  );
}
