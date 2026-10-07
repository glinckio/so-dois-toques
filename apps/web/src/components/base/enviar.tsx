"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { classeBotao } from "@/components/ui";
import { Carregando } from "./bola";

/**
 * Botão de enviar: enquanto envia, fica desabilitado e a bola gira no lugar do
 * ícone. Aceita o `enviando` de `useActionState`; sem ele, usa o estado do formulário.
 */
export function BotaoEnviar({
  children,
  enviando,
  textoEnviando,
  className = classeBotao,
  icone,
  disabled,
}: {
  children: ReactNode;
  enviando?: boolean;
  textoEnviando?: string;
  className?: string;
  icone?: ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const ocupado = enviando ?? pending;
  return (
    <button type="submit" className={className} disabled={ocupado || disabled} aria-busy={ocupado}>
      {ocupado ? <Carregando /> : icone}
      {ocupado && textoEnviando ? textoEnviando : children}
    </button>
  );
}
