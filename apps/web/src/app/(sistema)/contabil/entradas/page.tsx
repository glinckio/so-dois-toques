import type { Metadata } from "next";
import { connection } from "next/server";
import { estornarEntrada } from "@/app/acoes/gastos";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FormEntrada } from "@/components/contabil/form-entrada";
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
import type { Caixa, Entrada } from "@/lib/contabil/tipos";
import { competenciaAtual, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Entradas | Só Dois Toques" };

const MES = /^\d{4}-\d{2}$/;

/**
 * ENTRADA-CA-01 a 03: lançar à mão o que entra no caixa (outra receita ou aporte), ver as
 * entradas do mês com o estorno de cada uma e o saldo em caixa.
 */
export default async function PaginaEntradas({ searchParams }: PageProps<"/contabil/entradas">) {
  await connection();
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia = typeof pedida === "string" && MES.test(pedida) ? pedida : competenciaAtual();
  const [entradas, caixa] = await Promise.all([
    chamarApi<{ entradas: Entrada[] }>(`/gastos/entradas?competencia=${competencia}`),
    chamarApi<Caixa>("/gastos/saldo"),
  ]);

  return (
    <>
      <Cabecalho
        etiqueta="Contábil"
        icone="contabil"
        titulo={
          <>
            Entradas no <Destaque>caixa</Destaque>
          </>
        }
        descricao="Dinheiro que entra além das mensalidades: outras receitas e aportes. Lançamento errado se corrige com estorno."
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
          Lançar entrada
        </h2>
        <FormEntrada hoje={hojeEmSaoPaulo()} />
      </section>

      <section aria-labelledby="titulo-entradas" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <h2 id="titulo-entradas" className="text-lg font-bold first-letter:uppercase">
            Entradas de {nomeDoMes(competencia)}
          </h2>
          <form
            action="/contabil/entradas"
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
        {!entradas.ok ? (
          <Aviso tipo="erro">{entradas.mensagem}</Aviso>
        ) : entradas.dados.entradas.length === 0 ? (
          <p className="text-apagado px-1 text-sm">Nenhuma entrada lançada à mão neste mês.</p>
        ) : (
          <ListaDoCaixa
            rotulo="Entradas"
            itens={entradas.dados.entradas}
            estornar={estornarEntrada}
            textos={{
              titulo: "Estornar esta entrada",
              explicacao:
                "Entra uma saída contrária e o valor sai do caixa. O original continua no histórico.",
              confirmar: "Estornar esta entrada? O valor sai do saldo em caixa.",
            }}
          />
        )}
      </section>
    </>
  );
}
