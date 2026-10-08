"use client";

import { useState } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoSecundario } from "@/components/ui";

/** Senha temporária num cartão dourado, com o botão "Copiar". Aparece uma vez só. */
export function SenhaTemporaria({ senha, email }: { senha: string; email?: string }) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2500);
    } catch {
      setCopiada(false);
    }
  };
  return (
    <div
      role="status"
      className="border-ouro/40 animate-surgir relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-linear-to-br from-[#2b2008] to-transparent p-4 text-sm"
    >
      <span
        className="bg-ouro/20 absolute -top-8 -right-8 size-24 rounded-full blur-2xl"
        aria-hidden="true"
      />
      <p className="text-ouro relative flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase">
        <Icone nome="chave" width={15} height={15} />
        Senha temporária{email ? ` de ${email}` : ""}
      </p>
      <div className="relative flex flex-wrap items-center gap-3">
        <code
          data-testid="senha-temporaria"
          className="bg-noite/60 border-ouro/25 flex-1 rounded-xl border px-3 py-2 font-mono text-lg font-bold tracking-wider break-all select-all"
        >
          {senha}
        </code>
        <button type="button" onClick={copiar} className={`${classeBotaoSecundario} min-h-11 px-4`}>
          <Icone nome={copiada ? "check" : "copiar"} width={17} height={17} />
          {copiada ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p className="text-suave relative">
        Ela aparece só agora; repasse com cuidado. No primeiro acesso a pessoa vai definir uma senha
        nova.
      </p>
    </div>
  );
}
