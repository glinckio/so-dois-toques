import type { ReactNode } from "react";
import { SeloIcone, type Tom } from "@/components/base/selo";
import type { NomeIcone } from "@/components/icones";

/**
 * Bloco de formulário em cartão: a legenda do grupo vira o título, com o ícone em
 * selo, e os campos ficam em duas colunas no computador.
 */
export function GrupoDoFormulario({
  legenda,
  icone,
  tom = "roxo",
  dica,
  colunas = "sm:grid-cols-2",
  children,
}: {
  legenda: string;
  icone: NomeIcone;
  tom?: Tom;
  dica?: string;
  colunas?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="superficie min-w-0 rounded-[1.75rem] p-5 sm:p-6">
      <legend className="float-left mb-4 flex w-full items-center gap-3">
        <SeloIcone nome={icone} tom={tom} />
        <span className="flex flex-col">
          <span className="text-lg leading-tight font-bold">{legenda}</span>
          {dica && <span className="text-apagado text-sm font-normal">{dica}</span>}
        </span>
      </legend>
      <div className={`clear-both grid gap-4 ${colunas}`}>{children}</div>
    </fieldset>
  );
}
