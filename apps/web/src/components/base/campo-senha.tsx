"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Icone } from "@/components/icones";
import { classeCampo, classeRotulo } from "@/components/ui";
import { forcaDaSenha } from "@/lib/base/senha";

/**
 * VIVO-CA-10: campo de senha com o botão "Mostrar senha" e, na senha nova, a
 * régua de força.
 */
export function CampoSenha({
  rotulo,
  id,
  medirForca = false,
  aoDigitar,
  ...props
}: {
  rotulo: string;
  id: string;
  medirForca?: boolean;
  aoDigitar?: (valor: string) => void;
} & Omit<ComponentProps<"input">, "onInput">) {
  const [visivel, setVisivel] = useState(false);
  const [valor, setValor] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const forca = forcaDaSenha(valor);

  // Depois de enviar, o React limpa o formulário: a régua e a conferência voltam a zero.
  useEffect(() => {
    const formulario = campo.current?.form;
    if (!formulario) return;
    const limpar = () => {
      setValor("");
      aoDigitar?.("");
    };
    formulario.addEventListener("reset", limpar);
    return () => formulario.removeEventListener("reset", limpar);
  }, [aoDigitar]);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <div className="relative">
        <Icone
          nome="cadeado"
          width={18}
          height={18}
          className="text-apagado pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <input
          ref={campo}
          id={id}
          name={id}
          type={visivel ? "text" : "password"}
          className={`${classeCampo} pr-12 pl-11`}
          onInput={(evento) => {
            setValor(evento.currentTarget.value);
            aoDigitar?.(evento.currentTarget.value);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-pressed={visivel}
          className="text-apagado hover:text-texto absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full transition-colors"
        >
          <Icone nome={visivel ? "olho-fechado" : "olho"} width={18} height={18} />
          <span className="sr-only">{visivel ? "Ocultar senha" : "Mostrar senha"}</span>
        </button>
      </div>
      {medirForca && valor && (
        <div className="flex items-center gap-3" data-testid="forca-da-senha">
          <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  i <= forca.nivel
                    ? ["bg-perigo", "bg-ouro", "bg-roxo", "bg-sucesso"][forca.nivel]
                    : "bg-elevado"
                }`}
              />
            ))}
          </div>
          <span className="text-suave text-xs font-semibold" aria-live="polite">
            Força: {forca.rotulo}
          </span>
        </div>
      )}
    </div>
  );
}
