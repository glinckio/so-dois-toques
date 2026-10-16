import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { TabelaMensal } from "@/components/graficos/tabela-mensal";
import { Icone } from "@/components/icones";
import { CartaoNumero } from "@/components/inicio/kpi";
import {
  AcessoNegado,
  Aviso,
  classeBotaoSecundario,
  classeCampo,
  classeRotulo,
} from "@/components/ui";
import { mesCurto } from "@/lib/graficos/escala";
import { consultaDoPeriodo, descreverPeriodo } from "@/lib/contabil/formatacao";
import { mesesDoGrafico, NOMES_DO_GRAFICO, type Painel } from "@/lib/contabil/tipos";
import {
  competenciaAtual,
  deslocarMes,
  FORMAS,
  formatarReais,
  type Forma,
} from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Contábil | Só Dois Toques" };

const numero = "text-right tabular-nums";

/** FOCO-CA-09: painel das mensalidades no período, só para o administrador (CONT-CA-10). */
export default async function PaginaContabil({ searchParams }: PageProps<"/contabil">) {
  await connection();
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  const parametros = await searchParams;
  const consulta = consultaDoPeriodo(parametros);
  const resposta = await chamarApi<Painel>(`/contabil/painel${consulta ? `?${consulta}` : ""}`);
  const atual = competenciaAtual();
  const mesEscolhido = typeof parametros.competencia === "string" ? parametros.competencia : atual;
  const porPeriodo = consulta.startsWith("de=");
  const meses = [0, -1, -2, -3, -4, -5].map((n) => deslocarMes(atual, n));

  return (
    <>
      <Cabecalho
        etiqueta="Gestão"
        icone="contabil"
        titulo={
          <>
            <Destaque>Contábil</Destaque> do Só Dois Toques
          </>
        }
        descricao="Mensalidades recebidas, estornos e o que falta receber, pelo dia em que o dinheiro entrou ou saiu."
        acoes={
          resposta.ok && (
            <a
              href={`/contabil/exportar${consulta ? `?${consulta}` : ""}`}
              className={classeBotaoSecundario}
              download
            >
              <Icone nome="abaixo" width={18} height={18} />
              Baixar lançamentos (CSV)
            </a>
          )
        }
      />

      <section
        aria-label="Período"
        className="superficie flex flex-col gap-4 rounded-[1.75rem] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <PilulasDeLinks
            rotulo="Meses"
            itens={meses.map((c) => ({
              href: `/contabil?competencia=${c}`,
              rotulo: `${mesCurto(c).replace(/^./, (l) => l.toUpperCase())}${c.slice(0, 4) === atual.slice(0, 4) ? "" : ` ${c.slice(0, 4)}`}`,
              atual: !porPeriodo && c === mesEscolhido,
            }))}
          />
          {resposta.ok && (
            <p className="text-suave flex items-center gap-2 px-1 text-sm" data-testid="periodo">
              <Icone nome="calendario" width={15} height={15} className="text-ouro" />
              {descreverPeriodo(resposta.dados.periodo.de, resposta.dados.periodo.ate)} · regime de
              caixa
            </p>
          )}
        </div>
        <details className="group lg:max-w-[34rem]" open={porPeriodo || undefined}>
          <summary className="text-roxo-claro hover:text-texto inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-sm font-semibold">
            <Icone
              nome="abaixo"
              width={16}
              height={16}
              className="transition-transform group-open:rotate-180"
            />
            Outro mês ou período
          </summary>
          <div className="animate-entrar mt-3 flex flex-wrap items-end gap-3">
            <form className="flex items-end gap-2" action="/contabil" aria-label="Escolher mês">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="competencia" className={classeRotulo}>
                  Mês
                </label>
                <input
                  id="competencia"
                  name="competencia"
                  type="month"
                  defaultValue={mesEscolhido}
                  className={`${classeCampo} w-auto`}
                />
              </div>
              <button type="submit" className={classeBotaoSecundario}>
                Ver mês
              </button>
            </form>
            <form
              className="flex flex-wrap items-end gap-2"
              action="/contabil"
              aria-label="Escolher período"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="de" className={classeRotulo}>
                  De
                </label>
                <input
                  id="de"
                  name="de"
                  type="date"
                  required
                  defaultValue={resposta.ok ? resposta.dados.periodo.de : undefined}
                  className={`${classeCampo} w-auto`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ate" className={classeRotulo}>
                  Até
                </label>
                <input
                  id="ate"
                  name="ate"
                  type="date"
                  required
                  defaultValue={resposta.ok ? resposta.dados.periodo.ate : undefined}
                  className={`${classeCampo} w-auto`}
                />
              </div>
              <button type="submit" className={classeBotaoSecundario}>
                Ver período
              </button>
            </form>
          </div>
        </details>
      </section>

      {resposta.ok ? (
        <Conteudo painel={resposta.dados} />
      ) : (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      )}
    </>
  );
}

function Conteudo({ painel: p }: { painel: Painel }) {
  const meses = mesesDoGrafico(p.comparativo);
  const vencidas = p.aReceber.quantidade;
  return (
    <>
      <section aria-label="Resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          rotulo="Recebido"
          icone="subir"
          tom="roxo"
          valor={p.recebido}
          serie={p.comparativo.map((m) => m.recebido)}
          nota="Mensalidades pagas no período"
          testId="indicador-Recebido"
        />
        <CartaoNumero
          rotulo="Estornos"
          icone="descer"
          tom="ouro"
          valor={p.estornos}
          serie={p.comparativo.map((m) => m.estornos)}
          nota="Pagamentos devolvidos no período"
          testId="indicador-Estornos"
          subirEhRuim
        />
        <CartaoNumero
          rotulo="Resultado"
          icone="contabil"
          tom="sucesso"
          valor={p.resultado}
          serie={p.comparativo.map((m) => m.resultado)}
          nota="Recebido menos estornos"
          testId="indicador-Resultado"
          destaque
        />
        <CartaoNumero
          rotulo="A receber"
          icone="relogio"
          tom="areia"
          valor={p.aReceber.valorCentavos}
          nota={`${vencidas} ${vencidas === 1 ? "mensalidade vencida" : "mensalidades vencidas"}, até hoje`}
          testId="indicador-A-receber"
        />
      </section>

      <Conferencia painel={p} />

      <Cartao aria-labelledby="titulo-formas" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-formas"
          icone="cartao"
          titulo="Formas de pagamento"
          descricao="Entradas, saídas e saldo de cada forma no período"
        />
        <div className="-mx-1 overflow-x-auto px-1">
          <table
            className="w-full min-w-[30rem] border-separate border-spacing-y-1.5 text-sm"
            aria-label="Formas de pagamento"
          >
            <thead>
              <tr className="text-left">
                <th scope="col">Forma</th>
                <th scope="col" className={numero}>
                  Entradas
                </th>
                <th scope="col" className={numero}>
                  Saídas
                </th>
                <th scope="col" className={numero}>
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(FORMAS) as Forma[]).map((forma) => (
                <tr key={forma}>
                  <th scope="row" className="text-left font-semibold">
                    <span className="flex items-center gap-2.5">
                      <span className="bg-roxo/15 text-roxo-claro grid size-8 place-items-center rounded-xl">
                        <Icone nome={ICONES_DAS_FORMAS[forma]} width={16} height={16} />
                      </span>
                      {FORMAS[forma]}
                    </span>
                  </th>
                  <td className={`${numero} text-sucesso`}>
                    {formatarReais(p.porForma[forma].entradas)}
                  </td>
                  <td className={`${numero} text-perigo`}>
                    {formatarReais(p.porForma[forma].saidas)}
                  </td>
                  <td className={`${numero} font-bold`}>
                    {formatarReais(p.porForma[forma].saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao aria-labelledby="titulo-12-meses" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-12-meses"
          icone="contabil"
          titulo="Últimos 12 meses"
          descricao="Mensalidades recebidas e estornos de cada mês, regime de caixa"
        />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <BarrasMensais meses={meses} nomes={NOMES_DO_GRAFICO} />
          <TabelaMensal meses={meses} nomes={NOMES_DO_GRAFICO} />
        </div>
      </Cartao>
    </>
  );
}

/**
 * Conferência com o livro-razão: a conta escrita em blocos e um selo que desenha o
 * "check" quando bate (ou mostra o alerta quando não bate).
 */
function Conferencia({ painel: p }: { painel: Painel }) {
  const termos: { rotulo: string; valor: number; sinal?: string }[] = [
    { rotulo: "Resultado", valor: p.resultado },
    ...(p.naoClassificado !== 0
      ? [{ rotulo: "Outros", valor: p.naoClassificado, sinal: "+" }]
      : []),
    { rotulo: "Entradas", valor: p.entradas, sinal: "=" },
    { rotulo: "Saídas", valor: p.saidas, sinal: "−" },
  ];
  return (
    <section
      aria-label="Conferência com os lançamentos"
      className={`flex flex-col gap-4 rounded-[1.75rem] border p-5 sm:flex-row sm:items-center ${
        p.confere
          ? "border-sucesso/30 bg-sucesso/8"
          : "border-perigo/35 bg-perigo/8 animate-recusar"
      }`}
    >
      <span
        className={`grid size-14 shrink-0 place-items-center rounded-full ${p.confere ? "bg-sucesso/20 text-sucesso" : "bg-perigo/20 text-perigo"}`}
      >
        {p.confere ? (
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100 200"
              className="animate-desenhar [animation-delay:300ms]"
            />
          </svg>
        ) : (
          <Icone nome="alerta" width={26} height={26} />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5" data-testid="conferencia">
        <p className="font-bold">
          {p.confere ? "Confere com os lançamentos" : "Não confere com os lançamentos"}
          <span className="text-suave font-normal">
            {p.confere
              ? ": o resultado fecha com o que entrou e saiu."
              : ": a conta abaixo não fecha. Confira os lançamentos do período."}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          {termos.map((t) => (
            <span key={t.rotulo} className="inline-flex items-center gap-1.5">
              {t.sinal && <span className="text-apagado font-bold">{t.sinal}</span>}
              <span className="border-borda bg-noite/40 inline-flex flex-col rounded-xl border px-2.5 py-1">
                <span className="text-apagado text-[0.65rem] font-semibold">{t.rotulo}</span>
                <span className="font-semibold tabular-nums">{formatarReais(t.valor)}</span>
              </span>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
