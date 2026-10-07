import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

export type Opcao = { valor: string; rotulo: string; icone?: NomeIcone; detalhe?: ReactNode };

/**
 * Escolha única em blocos (forma de pagamento, quadra): cada opção é um rádio com
 * rótulo próprio, então o teclado e o leitor de tela funcionam como num rádio comum.
 */
export function OpcoesEmBlocos({
  nome,
  legenda,
  opcoes,
  padrao,
  colunas = "grid-cols-2 sm:grid-cols-4",
  obrigatorio = true,
  idBase,
}: {
  nome: string;
  legenda: string;
  opcoes: readonly Opcao[];
  padrao?: string;
  colunas?: string;
  obrigatorio?: boolean;
  idBase?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-suave mb-1.5 text-sm font-medium">{legenda}</legend>
      <div className={`grid gap-2 ${colunas}`}>
        {opcoes.map((o) => {
          const id = `${idBase ?? nome}-${o.valor}`;
          return (
            <label
              key={o.valor}
              htmlFor={id}
              className="group border-borda bg-elevado/40 has-checked:border-roxo has-checked:bg-roxo-forte/20 has-focus-visible:outline-ouro relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 transition duration-200 hover:border-[#3a2f6b] active:scale-[0.98] has-checked:shadow-[0_10px_30px_-16px_rgb(166_103_252_/_0.9)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
            >
              <input
                id={id}
                type="radio"
                name={nome}
                value={o.valor}
                required={obrigatorio}
                defaultChecked={padrao === o.valor}
                className="peer sr-only"
              />
              {o.icone && (
                <span className="bg-elevado text-suave group-has-checked:bg-roxo group-has-checked:text-fundo grid size-9 shrink-0 place-items-center rounded-xl transition-colors">
                  <Icone nome={o.icone} width={18} height={18} />
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{o.rotulo}</span>
                {o.detalhe && <span className="text-apagado text-xs">{o.detalhe}</span>}
              </span>
              <span
                aria-hidden="true"
                className="border-borda group-has-checked:border-roxo group-has-checked:bg-roxo ml-auto grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
              >
                <Icone
                  nome="check"
                  width={12}
                  height={12}
                  strokeWidth={3.2}
                  className="text-fundo scale-0 transition-transform duration-200 group-has-checked:scale-100"
                />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Ícone de cada forma de pagamento. */
export const ICONES_DAS_FORMAS: Record<string, NomeIcone> = {
  PIX: "pix",
  DINHEIRO: "dinheiro",
  CARTAO_DEBITO: "cartao",
  CARTAO_CREDITO: "cartao",
};
