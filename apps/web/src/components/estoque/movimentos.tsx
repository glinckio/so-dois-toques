import { SeloIcone, type Tom } from "@/components/base/selo";
import type { NomeIcone } from "@/components/icones";
import { TIPOS_MOVIMENTO } from "@/lib/estoque/formatacao";
import { quando } from "@/lib/estoque/resumos";
import type { Extrato } from "@/lib/estoque/tipos";

type Tipo = keyof typeof TIPOS_MOVIMENTO;

const ICONE: Record<Tipo, NomeIcone> = {
  COMPRA: "sacola",
  VENDA: "carrinho",
  AJUSTE: "editar",
  ESTORNO_VENDA: "estorno",
  ESTORNO_COMPRA: "estorno",
};

const TOM: Record<Tipo, Tom> = {
  COMPRA: "sucesso",
  VENDA: "roxo",
  AJUSTE: "areia",
  ESTORNO_VENDA: "ouro",
  ESTORNO_COMPRA: "perigo",
};

/** "+6" para o que entra, "−2" para o que sai. */
function quantidadeComSinal(quantidade: number) {
  return quantidade > 0 ? `+${quantidade}` : `−${Math.abs(quantidade)}`;
}

/**
 * ESTQ-CA-07: extrato do produto como linha do tempo. Cada movimento tem o ícone e a
 * cor do tipo (compra, venda, ajuste, estorno), quanto entrou ou saiu e o saldo depois.
 */
export function LinhaDoTempoDeMovimentos({ movimentos }: { movimentos: Extrato["movimentos"] }) {
  return (
    <ol aria-label="Movimentações" className="flex flex-col">
      {movimentos.map((m, i) => {
        const { dia, hora } = quando(m.criadoEm);
        const entrou = m.quantidade > 0;
        return (
          <li
            key={m.id}
            className={`animate-entrar atraso-${Math.min(i, 16)} relative flex gap-3.5 pb-5 last:pb-0`}
          >
            {i < movimentos.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-borda absolute top-11 bottom-1 left-5 w-px -translate-x-1/2"
              />
            )}
            <SeloIcone nome={ICONE[m.tipo]} tom={TOM[m.tipo]} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <p className="flex items-start justify-between gap-3">
                <span className="font-semibold">{TIPOS_MOVIMENTO[m.tipo]}</span>
                <span
                  className={`shrink-0 font-extrabold tabular-nums ${entrou ? "text-sucesso" : "text-perigo"}`}
                >
                  {quantidadeComSinal(m.quantidade)}
                  <span className="sr-only">{entrou ? " entrou" : " saiu"}</span>
                </span>
              </p>
              {m.motivo && <p className="text-suave text-sm">{m.motivo}</p>}
              <p className="text-apagado flex flex-wrap items-center justify-between gap-x-3 text-xs">
                <span>
                  {dia} às {hora} · {m.criadoPor}
                </span>
                <span className="tabular-nums">
                  saldo <strong className="text-suave">{m.saldoDepois}</strong>
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
