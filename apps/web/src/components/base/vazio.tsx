import type { ReactNode } from "react";
import { Bola } from "./bola";

/** Tela ou lista vazia: a bola, uma frase curta e a ação que resolve. */
export function Vazio({
  titulo,
  children,
  acao,
  compacto = false,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div
      className={`border-borda flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed text-center ${compacto ? "px-4 py-6" : "px-6 py-10"}`}
    >
      <span className="relative grid place-items-center">
        <span className="bg-roxo/25 absolute size-16 rounded-full blur-xl" aria-hidden="true" />
        <Bola tamanho={compacto ? 36 : 52} className="relative opacity-90" />
      </span>
      <p className="font-semibold">{titulo}</p>
      {children && <div className="text-apagado max-w-sm text-sm">{children}</div>}
      {acao}
    </div>
  );
}
