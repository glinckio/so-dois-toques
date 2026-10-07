"use client";

import { useId, useRef, type FormEvent, type RefObject } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoPerigo, classeBotaoSecundario } from "@/components/ui";

/**
 * VIVO-CA-04: confirmação do sistema no lugar do `confirm()` do navegador.
 * Devolve o `onSubmit` do formulário e a janela: o primeiro envio abre a janela;
 * "Cancelar" ou Esc fecham sem fazer nada; "Confirmar" envia de verdade.
 */
export function useConfirmacao(ativa: boolean) {
  const janela = useRef<HTMLDialogElement>(null);
  const confirmado = useRef(false);
  const formulario = useRef<HTMLFormElement | null>(null);
  const aoEnviar = (evento: FormEvent<HTMLFormElement>) => {
    if (!ativa || confirmado.current) {
      confirmado.current = false;
      return;
    }
    evento.preventDefault();
    formulario.current = evento.currentTarget;
    janela.current?.showModal();
  };
  const confirmar = () => {
    janela.current?.close();
    confirmado.current = true;
    formulario.current?.requestSubmit();
  };
  return { janela, aoEnviar, confirmar };
}

export function JanelaDeConfirmacao({
  janela,
  titulo,
  mensagem,
  aoConfirmar,
}: {
  janela: RefObject<HTMLDialogElement | null>;
  titulo: string;
  mensagem: string;
  aoConfirmar: () => void;
}) {
  const idTitulo = useId();
  const idMensagem = useId();
  return (
    <dialog
      ref={janela}
      aria-labelledby={idTitulo}
      aria-describedby={idMensagem}
      className="superficie open:animate-surgir text-texto m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[1.75rem] p-6"
    >
      <div className="flex flex-col gap-4">
        <span className="bg-ouro/15 text-ouro relative grid size-12 place-items-center rounded-2xl">
          <span
            className="animate-pulsar text-ouro/50 absolute inset-0 rounded-2xl"
            aria-hidden="true"
          />
          <Icone nome="alerta" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id={idTitulo} className="text-xl font-bold">
            {titulo}
          </h2>
          <p id={idMensagem} className="text-suave">
            {mensagem}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={classeBotaoSecundario}
            onClick={() => janela.current?.close()}
          >
            Cancelar
          </button>
          <button type="button" className={classeBotaoPerigo} onClick={aoConfirmar}>
            Confirmar
          </button>
        </div>
      </div>
    </dialog>
  );
}
