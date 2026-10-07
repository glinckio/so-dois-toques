import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

/** Palavra do título em destaque, com o degradê da marca. */
export function Destaque({ children }: { children: ReactNode }) {
  return <span className="texto-marca">{children}</span>;
}

/**
 * Cabeçalho das telas: etiqueta da área com ícone, título grande (com uma palavra
 * em destaque), descrição e as ações principais.
 */
export function Cabecalho({
  etiqueta,
  icone,
  titulo,
  descricao,
  acoes,
  testIdDescricao,
}: {
  etiqueta?: string;
  icone?: NomeIcone;
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  testIdDescricao?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-2">
        {etiqueta && (
          <span className="text-roxo-claro inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
            {icone && <Icone nome={icone} width={15} height={15} />}
            {etiqueta}
          </span>
        )}
        <h1 className="text-3xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-4xl">
          {titulo}
        </h1>
        {descricao && (
          <p className="text-suave max-w-2xl text-[0.95rem]" data-testid={testIdDescricao}>
            {descricao}
          </p>
        )}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
