import type { Metadata } from "next";
import { connection } from "next/server";
import { estornarGasto } from "@/app/acoes/gastos";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo } from "@/components/base/selo";
import { FormGasto } from "@/components/contabil/form-gasto";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import {
  AcessoNegado,
  Aviso,
  classeBotaoSecundario,
  classeCampo,
  classeCartao,
  classeRotulo,
} from "@/components/ui";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Caixa, Saida } from "@/lib/contabil/tipos";
import type { Quadra } from "@/lib/horarios/tipos";
import { competenciaAtual, FORMAS, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Gastos | Só Dois Toques" };

const MES = /^\d{4}-\d{2}$/;

/**
 * GASTO-CA-05 a 07: lançar locação avulsa e outros gastos, ver as saídas do mês com o
 * estorno de cada uma e o saldo em caixa.
 */
export default async function PaginaGastos({ searchParams }: PageProps<"/contabil/gastos">) {
  await connection();
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia = typeof pedida === "string" && MES.test(pedida) ? pedida : competenciaAtual();
  const [saidas, quadras, caixa] = await Promise.all([
    chamarApi<{ saidas: Saida[] }>(`/gastos?competencia=${competencia}`),
    chamarApi<Quadra[]>("/horarios/quadras"),
    chamarApi<Caixa>("/gastos/saldo"),
  ]);
  const hoje = hojeEmSaoPaulo();

  return (
    <>
      <Cabecalho
        etiqueta="Contábil"
        icone="contabil"
        titulo={
          <>
            Gastos do <Destaque>caixa</Destaque>
          </>
        }
        descricao="Locação avulsa de quadra, equipamentos, investimentos e outros gastos. Lançamento errado se corrige com estorno."
        acoes={
          caixa.ok && (
            <p
              className="superficie flex flex-col rounded-2xl px-4 py-2 text-right"
              data-testid="saldo-em-caixa"
            >
              <span className="text-apagado text-xs font-semibold">Saldo em caixa</span>
              <span className="text-lg font-extrabold tabular-nums">
                {formatarReais(caixa.dados.saldoCentavos)}
              </span>
            </p>
          )
        }
      />

      <section aria-labelledby="titulo-lancar" className={classeCartao}>
        <h2 id="titulo-lancar" className="mb-4 text-lg font-bold">
          Lançar gasto
        </h2>
        {quadras.ok ? (
          <FormGasto quadras={quadras.dados.filter((q) => q.ativa)} hoje={hoje} />
        ) : (
          <Aviso tipo="erro">{quadras.mensagem}</Aviso>
        )}
      </section>

      <section aria-labelledby="titulo-saidas" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <h2 id="titulo-saidas" className="text-lg font-bold first-letter:uppercase">
            Saídas de {nomeDoMes(competencia)}
          </h2>
          <form
            action="/contabil/gastos"
            className="flex items-end gap-2"
            aria-label="Escolher mês"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="competencia" className={classeRotulo}>
                Mês
              </label>
              <input
                id="competencia"
                name="competencia"
                type="month"
                defaultValue={competencia}
                className={`${classeCampo} w-auto`}
              />
            </div>
            <button type="submit" className={classeBotaoSecundario}>
              Ver mês
            </button>
          </form>
        </div>
        {!saidas.ok ? (
          <Aviso tipo="erro">{saidas.mensagem}</Aviso>
        ) : saidas.dados.saidas.length === 0 ? (
          <p className="text-apagado px-1 text-sm">Nenhuma saída neste mês.</p>
        ) : (
          <ul aria-label="Saídas" className="flex flex-col gap-3">
            {saidas.dados.saidas.map((s) => (
              <li key={s.id} className={`${classeCartao} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Selo tom={s.ehEstorno ? "sucesso" : "perigo"}>
                        {s.ehEstorno ? `Estorno · ${s.nomeCategoria}` : s.nomeCategoria}
                      </Selo>
                      {s.estorno && <Selo tom="neutro">Estornado</Selo>}
                    </div>
                    <p className="font-semibold">{s.descricao}</p>
                    <p className="text-apagado text-sm">
                      {formatarData(s.data)} · {FORMAS[s.forma]} · por {s.criadoPor}
                    </p>
                  </div>
                  <p
                    className={`text-lg font-extrabold tabular-nums ${s.ehEstorno ? "text-sucesso" : "text-perigo"}`}
                  >
                    {s.ehEstorno ? "+" : "−"} {formatarReais(s.valorCentavos)}
                  </p>
                </div>
                {!s.ehEstorno && !s.estorno && (
                  <details className="group">
                    <summary className="text-suave hover:text-texto inline-flex min-h-10 items-center text-sm font-semibold">
                      Estornar
                    </summary>
                    <div className="animate-entrar pt-2">
                      <FormMotivo
                        acao={estornarGasto}
                        campos={{ lancamentoId: s.id }}
                        titulo="Estornar este gasto"
                        explicacao="Entra um lançamento contrário e o valor volta para o caixa. O original continua no histórico."
                        rotulo="Estornar"
                        idCampo={`motivo-${s.id}`}
                        confirmar="Estornar este gasto? O valor volta para o saldo em caixa."
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
  );
}
