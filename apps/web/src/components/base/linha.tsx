import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Linha de lista: ícone ou avatar, título, detalhe e o valor à direita. Com `href`,
 * a linha toda vira link.
 */
export function Linha({
  inicio,
  titulo,
  detalhe,
  fim,
  href,
  className = "",
  riscada = false,
}: {
  inicio?: ReactNode;
  titulo: ReactNode;
  detalhe?: ReactNode;
  fim?: ReactNode;
  href?: string;
  className?: string;
  riscada?: boolean;
}) {
  const conteudo = (
    <>
      {inicio}
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-semibold ${riscada ? "text-apagado line-through" : ""}`}
        >
          {titulo}
        </span>
        {detalhe && <span className="text-apagado block truncate text-sm">{detalhe}</span>}
      </span>
      {fim && <span className="shrink-0 text-right">{fim}</span>}
    </>
  );
  const base = `flex items-center gap-3 rounded-2xl px-3 py-3 ${className}`;
  return href ? (
    <Link href={href} className={`${base} hover:bg-elevado/70 transition-colors`}>
      {conteudo}
    </Link>
  ) : (
    <div className={base}>{conteudo}</div>
  );
}
