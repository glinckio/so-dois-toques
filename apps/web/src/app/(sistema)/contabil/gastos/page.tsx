import type { Metadata } from "next";
import { connection } from "next/server";
import { estornarGasto } from "@/app/acoes/gastos";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FormGasto } from "@/components/contabil/form-gasto";
import { ListaDoCaixa } from "@/components/contabil/lista-do-caixa";
import {
  AcessoNegado,
  Aviso,
  classeBotaoSecundario,
  classeCampo,
  classeCartao,
  classeRotulo,
} from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Caixa, Saida } from "@/lib/contabil/tipos";
import type { Quadra } from "@/lib/horarios/tipos";
import { competenciaAtual, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
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
          <ListaDoCaixa
            rotulo="Saídas"
            itens={saidas.dados.saidas}
            estornar={estornarGasto}
            textos={{
              titulo: "Estornar este gasto",
              explicacao:
                "Entra um lançamento contrário e o valor volta para o caixa. O original continua no histórico.",
              confirmar: "Estornar este gasto? O valor volta para o saldo em caixa.",
            }}
          />
        )}
      </section>
    </>
  );
}
