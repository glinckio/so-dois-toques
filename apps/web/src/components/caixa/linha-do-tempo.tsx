import Link from "next/link";
import { estornarAvulso } from "@/app/acoes/caixa";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Icone } from "@/components/icones";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { ehAvulso, nomeDaCategoria } from "@/lib/caixa/formatacao";
import { horaEmSaoPaulo } from "@/lib/caixa/painel";
import { FORMAS, type Forma } from "@/lib/mensalidades/formatacao";
import { visualDaCategoria } from "./categorias";

export type ItemDoTempo = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  valorCentavos: number;
  forma: Forma;
  categoria: string;
  descricao: string;
  criadoPor: string;
  criadoEm: string;
  estornado: boolean;
  origemTipo?: string | null;
  origemId?: string | null;
};

/**
 * Lançamentos em linha do tempo: a hora, o selo da categoria preso à linha e o valor
 * em verde (entrada, "+") ou vermelho (saída, "−"). Estornados ficam riscados. Com
 * `estornar`, o administrador estorna avulsos ali mesmo, com motivo e confirmação.
 */
export function LinhaDoTempo({
  itens,
  rotulo,
  mostrarData = false,
  estornar = false,
}: {
  itens: readonly ItemDoTempo[];
  rotulo: string;
  /** Mostra o dia embaixo da hora (turno que passou de um dia para o outro). */
  mostrarData?: boolean;
  estornar?: boolean;
}) {
  return (
    <ol className="flex flex-col" aria-label={rotulo}>
      {itens.map((l, i) => {
        const entrada = l.tipo === "ENTRADA";
        const visual = visualDaCategoria(l.categoria);
        const hora = horaEmSaoPaulo(l.criadoEm);
        const dia = hojeEmSaoPaulo(new Date(l.criadoEm));
        const ultimo = i === itens.length - 1;
        return (
          <li
            key={l.id}
            className={`animate-entrar grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3rem_2.25rem_minmax(0,1fr)] atraso-${Math.min(24, i + 1)}`}
          >
            <span className="hidden pt-3 text-right text-sm leading-tight font-bold tabular-nums sm:block">
              <time dateTime={l.criadoEm}>{hora}</time>
              {mostrarData && (
                <span className="text-apagado block text-xs font-medium">
                  {dia.slice(8, 10)}/{dia.slice(5, 7)}
                </span>
              )}
            </span>
            <span className="relative flex items-start justify-center" aria-hidden="true">
              {!ultimo && <span className="bg-borda absolute top-11 -bottom-1 w-px" />}
              <span className="ring-cartao relative mt-2 rounded-xl ring-4 print:ring-0">
                <SeloIcone
                  nome={visual.icone}
                  tom={l.estornado ? "neutro" : visual.tom}
                  tamanho="p"
                />
              </span>
            </span>
            <div className="hover:bg-elevado/45 mb-1.5 flex min-w-0 flex-col gap-1 rounded-2xl px-2.5 py-2 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`min-w-0 pt-0.5 font-semibold break-words ${l.estornado ? "text-apagado line-through" : ""}`}
                >
                  {l.descricao}
                </p>
                <span
                  className={`shrink-0 pt-0.5 text-right font-extrabold whitespace-nowrap print:text-black ${
                    l.estornado
                      ? "text-apagado line-through"
                      : entrada
                        ? "text-sucesso"
                        : "text-perigo"
                  }`}
                >
                  {entrada ? "+ " : "− "}
                  <Valor centavos={l.valorCentavos} />
                </span>
              </div>
              <p className="text-apagado flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <time dateTime={l.criadoEm} className="text-suave font-bold tabular-nums sm:hidden">
                  {mostrarData ? `${dia.slice(8, 10)}/${dia.slice(5, 7)} ` : ""}
                  {hora}
                </time>
                <Selo tom={l.estornado ? "neutro" : visual.tom}>
                  {nomeDaCategoria(l.categoria)}
                </Selo>
                {l.estornado && (
                  <Selo tom="neutro" semPonto>
                    Estornado
                  </Selo>
                )}
                <span className="inline-flex items-center gap-1">
                  <Icone nome={ICONES_DAS_FORMAS[l.forma] ?? "dinheiro"} width={13} height={13} />
                  {FORMAS[l.forma]}
                </span>
                <span>por {l.criadoPor}</span>
                {l.origemTipo === "Mensalidade" && l.origemId && (
                  <Link
                    href={`/caixa/mensalidades/${l.origemId}`}
                    className="text-roxo-claro hover:text-texto font-semibold underline-offset-2 hover:underline"
                  >
                    ver mensalidade
                  </Link>
                )}
              </p>
              {estornar && ehAvulso(l.categoria) && !l.estornado && (
                <details className="mt-1 print:hidden">
                  <summary className="text-suave hover:bg-elevado hover:text-texto -ml-2.5 inline-flex min-h-11 list-none items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
                    <Icone nome="estorno" width={15} height={15} />
                    Estornar
                  </summary>
                  <div className="animate-surgir pt-2">
                    <FormMotivo
                      acao={estornarAvulso}
                      campos={{ lancamentoId: l.id }}
                      titulo="Estornar lançamento avulso"
                      explicacao="Lança o valor contrário no caixa aberto. O lançamento original continua no histórico."
                      rotulo="Estornar lançamento"
                      idCampo={`motivo-${l.id}`}
                      confirmar="O valor contrário entra agora no caixa aberto. Lançamentos não são apagados: o original e o estorno ficam no histórico."
                    />
                  </div>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
