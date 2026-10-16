"use client";

import { useState, useSyncExternalStore } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoSecundario, classeCampo } from "@/components/ui";

const semAssinatura = () => () => {};

/** O link público do formulário (no endereço em que o sistema está aberto) e o botão de copiar. */
export function CopiarLink({ caminho }: { caminho: string }) {
  // O endereço só existe no navegador; no servidor, o caminho sozinho.
  const origem = useSyncExternalStore(
    semAssinatura,
    () => window.location.origin,
    () => "",
  );
  const link = `${origem}${caminho}`;
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="link-feedback" className="sr-only">
        Link do formulário
      </label>
      <input
        id="link-feedback"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className={`${classeCampo} font-mono text-sm`}
        data-testid="link-feedback"
      />
      <button type="button" onClick={copiar} className={`${classeBotaoSecundario} shrink-0`}>
        <Icone nome={copiado ? "check" : "copiar"} width={18} height={18} />
        <span aria-live="polite">{copiado ? "Copiado!" : "Copiar link"}</span>
      </button>
    </div>
  );
}
