import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { FORMAS, formatarReais, type Forma } from "@/lib/mensalidades/formatacao";
import type { CaixaDoDia } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Caixa | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** MENS-CA-17: lançamentos de um dia, com totais e saldo por forma de pagamento. */
export default async function PaginaCaixa({ searchParams }: PageProps<"/caixa">) {
  await connection();
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const resposta = await chamarApi<CaixaDoDia>(`/caixa/lancamentos?data=${data}`);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Caixa do dia</h1>
          <p className="opacity-80">{data === hoje ? "Hoje" : formatarData(data)}</p>
        </div>
        <form className="flex items-end gap-2" action="/caixa">
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
          <section aria-label="Resumo do dia" className="grid gap-3 sm:grid-cols-3">
            <Total rotulo="Entradas" valor={resposta.dados.resumo.entradas} />
            <Total rotulo="Saídas" valor={resposta.dados.resumo.saidas} />
            <Total rotulo="Saldo" valor={resposta.dados.resumo.saldo} destaque />
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Por forma de pagamento</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-current/15">
                  <th className="py-2 font-medium">Forma</th>
                  <th className="py-2 text-right font-medium">Entradas</th>
                  <th className="py-2 text-right font-medium">Saídas</th>
                  <th className="py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(FORMAS) as Forma[]).map((f) => {
                  const linha = resposta.dados.resumo.porForma[f];
                  return (
                    <tr key={f} className="border-b border-current/10">
                      <td className="py-2">{FORMAS[f]}</td>
                      <td className="py-2 text-right">{formatarReais(linha.entradas)}</td>
                      <td className="py-2 text-right">{formatarReais(linha.saidas)}</td>
                      <td className="py-2 text-right font-medium">{formatarReais(linha.saldo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Lançamentos</h2>
            {resposta.dados.lancamentos.length === 0 ? (
              <p className="opacity-80">Nenhum lançamento neste dia.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-current/10" aria-label="Lançamentos">
                {resposta.dados.lancamentos.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <span className="font-medium">{l.descricao}</span>
                      <span className="block text-sm opacity-80">
                        {FORMAS[l.forma]} · {l.criadoPor} ·{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          timeStyle: "short",
                        }).format(new Date(l.criadoEm))}
                        {l.origemTipo === "Mensalidade" && l.origemId && (
                          <>
                            {" · "}
                            <Link href={`/caixa/mensalidades/${l.origemId}`} className="underline">
                              ver mensalidade
                            </Link>
                          </>
                        )}
                      </span>
                    </span>
                    <span
                      className={`font-medium ${l.tipo === "SAIDA" ? "text-red-700 dark:text-red-400" : ""}`}
                    >
                      {l.tipo === "SAIDA" ? "− " : "+ "}
                      {formatarReais(l.valorCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Total({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-4 ${destaque ? "border-amber-600/50 bg-amber-600/10" : "border-current/15"}`}
    >
      <p className="text-sm opacity-80">{rotulo}</p>
      <p className="text-xl font-semibold">{formatarReais(valor)}</p>
    </div>
  );
}
