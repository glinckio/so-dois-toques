"use client";

import type { ChangeEvent, ComponentProps } from "react";
import { Campo } from "@/components/ui";
import { mascararReais, mascararTelefone, posicaoDoCursor } from "@/lib/base/mascaras";

type PropsDoCampo = ComponentProps<typeof Campo>;

/**
 * Aplica a máscara no próprio campo antes de avisar quem está ouvindo, então o
 * `onChange` do campo e o do formulário já recebem o texto formatado. O campo continua
 * não controlado: o envio do formulário e o "limpar" funcionam como num campo comum.
 */
function aoDigitar(
  mascarar: (texto: string) => string,
  daDireita: boolean,
  repassar?: (evento: ChangeEvent<HTMLInputElement>) => void,
) {
  return (evento: ChangeEvent<HTMLInputElement>) => {
    const campo = evento.currentTarget;
    const antes = campo.value;
    const depois = mascarar(antes);
    if (depois !== antes) {
      const cursor = campo.selectionStart ?? antes.length;
      campo.value = depois;
      if (document.activeElement === campo) {
        const posicao = posicaoDoCursor(antes, cursor, depois, daDireita);
        campo.setSelectionRange(posicao, posicao);
      }
    }
    repassar?.(evento);
  };
}

/** AJU-CA-02: telefone com DDD que se formata enquanto se digita. */
export function CampoTelefone({ onChange, ...props }: Omit<PropsDoCampo, "type" | "inputMode">) {
  return (
    <Campo
      icone="telefone"
      placeholder="(21) 99999-9999"
      autoComplete="off"
      {...props}
      type="tel"
      inputMode="numeric"
      onChange={aoDigitar(mascararTelefone, false, onChange)}
    />
  );
}

/** AJU-CA-03: valor em reais só com números, preenchido a partir dos centavos. */
export function CampoReais({
  onChange,
  ...props
}: Omit<PropsDoCampo, "type" | "inputMode" | "prefixo">) {
  return (
    <Campo
      placeholder="0,00"
      autoComplete="off"
      {...props}
      prefixo="R$"
      type="text"
      inputMode="numeric"
      onChange={aoDigitar(mascararReais, true, onChange)}
    />
  );
}
