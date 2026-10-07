import type { Metadata } from "next";
import { connection } from "next/server";
import { estornarVenda } from "@/app/acoes/estoque";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { VendasDoDia } from "@/lib/estoque/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Vendas do dia | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** ESTQ-CA-03 e 06: vendas de um dia, com estorno para o administrador. */
export default async function PaginaVendas({ searchParams }: PageProps<"/estoque/vendas">) {
  await connection();
  const { usuario } = await exigirArea("estoque");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const resposta = await chamarApi<VendasDoDia>(`/estoque/vendas?data=${data}`);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vendas do dia</h1>
          <p className="text-suave">{data === hoje ? "Hoje" : formatarData(data)}</p>
        </div>
        <form className="flex items-end gap-2" action="/estoque/vendas">
          <div className="flex flex-col gap-1">
            <label htmlFor="data" className="text-sm font-medium">
              Dia
            </label>
            <input
              id="data"
              name="data"
              type="date"
              max={hoje}
              defaultValue={data}
              className={classeCampo}
            />
          </div>
          <button type="submit" className={classeBotaoSecundario}>
            Ver
          </button>
        </form>
      </header>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <>
          <p className="text-lg font-semibold" data-testid="total-dia">
            Total vendido: {formatarReais(resposta.dados.totalCentavos)}
          </p>
          {resposta.dados.vendas.length === 0 ? (
            <p className="text-suave">Nenhuma venda neste dia.</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Vendas">
              {resposta.dados.vendas.map((v) => (
                <li
                  key={v.id}
                  className="border-borda bg-cartao flex flex-col gap-2 rounded-2xl border p-3"
                >
                  <p className={v.estornadaEm ? "text-apagado line-through" : ""}>
                    <span className="font-medium">{formatarReais(v.totalCentavos)}</span> ·{" "}
                    {FORMAS[v.forma]} · {v.feitaPor} · {formatarDataHora(v.feitaEm)}
                  </p>
                  <p className="text-suave text-sm">
                    {v.itens.map((i) => `${i.quantidade} × ${i.produto}`).join(", ")}
                  </p>
                  {v.estornadaEm ? (
                    <Aviso tipo="info">
                      Estornada em {formatarDataHora(v.estornadaEm)}. Motivo: {v.motivoEstorno}
                    </Aviso>
                  ) : (
                    admin && (
                      <details>
                        <summary className="cursor-pointer text-sm underline">Estornar</summary>
                        <div className="pt-2">
                          <FormMotivo
                            acao={estornarVenda}
                            campos={{ vendaId: v.id }}
                            titulo="Estornar venda"
                            explicacao="Os produtos voltam ao estoque e o valor sai do caixa aberto."
                            rotulo="Estornar venda"
                            idCampo={`motivo-${v.id}`}
                          />
                        </div>
                      </details>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
