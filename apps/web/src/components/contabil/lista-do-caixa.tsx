import { Selo } from "@/components/base/selo";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { classeCartao } from "@/components/ui";
import type { EstadoFormulario } from "@/app/acoes/estado";
import { formatarData } from "@/lib/aulas/formatacao";
import type { Entrada, Saida } from "@/lib/contabil/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";

/** O texto do estorno de cada lado do caixa. */
export type TextosDoEstorno = { titulo: string; explicacao: string; confirmar: string };

/**
 * GASTO-CA-06 e ENTRADA-CA-03: os lançamentos manuais do mês, cada um com o estorno
 * dele. O que entra no caixa aparece em verde com "+", o que sai em vermelho com "−".
 */
export function ListaDoCaixa({
  rotulo,
  itens,
  estornar,
  textos,
}: {
  rotulo: string;
  itens: readonly (Saida | Entrada)[];
  estornar: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  textos: TextosDoEstorno;
}) {
  return (
    <ul aria-label={rotulo} className="flex flex-col gap-3">
      {itens.map((l) => {
        const entra = l.tipo === "ENTRADA";
        return (
          <li key={l.id} className={`${classeCartao} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Selo tom={entra ? "sucesso" : "perigo"}>
                    {l.ehEstorno ? `Estorno · ${l.nomeCategoria}` : l.nomeCategoria}
                  </Selo>
                  {l.estorno && <Selo tom="neutro">Estornado</Selo>}
                </div>
                <p className="font-semibold">{l.descricao}</p>
                <p className="text-apagado text-sm">
                  {formatarData(l.data)} · {FORMAS[l.forma]} · por {l.criadoPor}
                </p>
              </div>
              <p
                className={`text-lg font-extrabold tabular-nums ${entra ? "text-sucesso" : "text-perigo"}`}
              >
                {entra ? "+" : "−"} {formatarReais(l.valorCentavos)}
              </p>
            </div>
            {!l.ehEstorno && !l.estorno && (
              <details className="group">
                <summary className="text-suave hover:text-texto inline-flex min-h-10 items-center text-sm font-semibold">
                  Estornar
                </summary>
                <div className="animate-entrar pt-2">
                  <FormMotivo
                    acao={estornar}
                    campos={{ lancamentoId: l.id }}
                    titulo={textos.titulo}
                    explicacao={textos.explicacao}
                    rotulo="Estornar"
                    idCampo={`motivo-${l.id}`}
                    confirmar={textos.confirmar}
                  />
                </div>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
