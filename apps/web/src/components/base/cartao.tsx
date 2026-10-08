import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";
import { SeloIcone, type Tom } from "./selo";

const VARIANTES = {
  padrao: "superficie",
  destaque: "superficie-destaque",
  vidro: "vidro",
  ouro: "border border-ouro/30 bg-linear-to-br from-[#2b2008] via-cartao to-cartao",
} as const;

/** Cartão das telas: padrão, destaque (borda roxa e dourada), vidro ou ouro. */
export function Cartao({
  variante = "padrao",
  className = "",
  children,
  ...props
}: { variante?: keyof typeof VARIANTES } & ComponentProps<"section">) {
  return (
    <section
      className={`relative rounded-[1.75rem] p-5 sm:p-6 ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

/** Cabeçalho de cartão: selo com ícone, título, descrição curta e uma ação à direita. */
export function CabecalhoCartao({
  icone,
  tom = "roxo",
  titulo,
  descricao,
  acao,
  id,
}: {
  icone?: NomeIcone;
  tom?: Tom;
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icone && <SeloIcone nome={icone} tom={tom} />}
        <div className="min-w-0">
          <h2 id={id} className="text-lg leading-tight font-bold">
            {titulo}
          </h2>
          {descricao && <p className="text-apagado mt-0.5 text-sm">{descricao}</p>}
        </div>
      </div>
      {acao}
    </div>
  );
}

/** Link discreto no canto do cartão ("Ver tudo →"). */
export function LinkDoCartao({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-roxo-claro hover:text-texto group inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
    >
      {children}
      <Icone
        nome="seta"
        width={15}
        height={15}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
