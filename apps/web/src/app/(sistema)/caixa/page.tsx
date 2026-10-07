import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { estornarAvulso } from "@/app/acoes/caixa";
import { FormAbertura } from "@/components/caixa/form-abertura";
import { FormAvulso } from "@/components/caixa/form-avulso";
import { FormFechamento } from "@/components/caixa/form-fechamento";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { ehAvulso, nomeDaCategoria } from "@/lib/caixa/formatacao";
import type { Turno } from "@/lib/caixa/tipos";
import { FORMAS, formatarReais, type Forma } from "@/lib/mensalidades/formatacao";
import type { CaixaDoDia } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Caixa | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** MENS-CA-17: lançamentos de um dia, com totais e saldo por forma de pagamento. */
export default async function PaginaCaixa({ searchParams }: PageProps<"/caixa">) {
  await connection();
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const { usuario } = await exigirArea("caixa");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const [resposta, atual] = await Promise.all([
    chamarApi<CaixaDoDia>(`/caixa/lancamentos?data=${data}`),
    chamarApi<{ turno: Turno | null }>("/caixa/sessao"),
  ]);
  const turno = atual.ok ? atual.dados.turno : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Caixa do dia</h1>
          <p className="text-suave">{data === hoje ? "Hoje" : formatarData(data)}</p>
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
      {!atual.ok ? (
        <Aviso tipo="erro">{atual.mensagem}</Aviso>
      ) : turno ? (
        <section aria-label="Caixa aberto" className="flex flex-col gap-4">
          <div className="border-sucesso/40 bg-sucesso/10 flex flex-col gap-1 rounded-lg border p-4">
            <h2 className="text-lg font-medium">Caixa aberto</h2>
            <p className="text-sm" data-testid="turno-aberto">
              Aberto por {turno.abertaPor} em {formatarDataHora(turno.abertaEm)} · troco{" "}
              {formatarReais(turno.trocoInicialCentavos)} · esperado em dinheiro{" "}
              {formatarReais(turno.esperadoDinheiroCentavos)}
            </p>
            <Link href={`/caixa/turnos/${turno.id}`} className="self-start text-sm underline">
              Ver o turno
            </Link>
          </div>
          <FormAvulso />
          <FormFechamento turnoId={turno.id} esperadoCentavos={turno.esperadoDinheiroCentavos} />
        </section>
      ) : (
        <section
          aria-label="Caixa fechado"
          className="border-ouro/40 bg-ouro/10 flex flex-col gap-3 rounded-lg border p-4"
        >
          <h2 className="text-lg font-medium">Caixa fechado</h2>
          <p className="text-sm">
            Abra o caixa para lançar avulsos. Pagamentos registrados com o caixa fechado ficam sem
            turno.
          </p>
          <FormAbertura />
        </section>
      )}
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
                <tr className="border-borda border-b">
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
                    <tr key={f} className="border-borda border-b">
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
              <p className="text-suave">Nenhum lançamento neste dia.</p>
            ) : (
              <ul className="divide-borda flex flex-col divide-y" aria-label="Lançamentos">
                {resposta.dados.lancamentos.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <span
                        className={`font-medium ${l.estornado ? "text-apagado line-through" : ""}`}
                      >
                        {l.descricao}
                      </span>
                      <span className="text-suave block text-sm">
                        {nomeDaCategoria(l.categoria)} · {FORMAS[l.forma]} · {l.criadoPor} ·{" "}
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
                      className={`font-medium ${l.tipo === "SAIDA" ? "text-perigo dark:text-perigo" : ""}`}
                    >
                      {l.tipo === "SAIDA" ? "− " : "+ "}
                      {formatarReais(l.valorCentavos)}
                    </span>
                    {admin && turno && ehAvulso(l.categoria) && !l.estornado && (
                      <details className="w-full">
                        <summary className="cursor-pointer text-sm underline">Estornar</summary>
                        <div className="pt-2">
                          <FormMotivo
                            acao={estornarAvulso}
                            campos={{ lancamentoId: l.id }}
                            titulo="Estornar lançamento avulso"
                            explicacao="Lança o valor contrário no caixa aberto. O lançamento original continua no histórico."
                            rotulo="Estornar lançamento"
                            idCampo={`motivo-${l.id}`}
                          />
                        </div>
                      </details>
                    )}
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
      className={`rounded-2xl border p-4 ${destaque ? "border-roxo/50 bg-roxo-forte/15" : "border-borda bg-cartao"}`}
    >
      <p className="text-suave text-sm">{rotulo}</p>
      <p className="text-xl font-semibold">{formatarReais(valor)}</p>
    </div>
  );
}
