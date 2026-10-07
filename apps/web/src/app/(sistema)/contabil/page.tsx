import type { Metadata } from "next";
import { connection } from "next/server";
import { Anel } from "@/components/base/anel";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { Valor } from "@/components/base/valor";
import { BarrasHorizontais } from "@/components/graficos/barras-horizontais";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { Rosca } from "@/components/graficos/rosca";
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
import {
  consultaDoPeriodo,
  descreverPeriodo,
  formatarPorcentagem,
  ORIGENS_RECEITA,
  TIPOS_DESPESA,
  TURNOS,
} from "@/lib/contabil/formatacao";
import type { OcupacaoTurno, Painel, Turno } from "@/lib/contabil/tipos";
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

/** CONT-CA-01 a 08: painel do período, só para o administrador (CONT-CA-10). */
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
        descricao="Receitas, despesas e resultado pelo dinheiro que entrou e saiu do caixa."
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
  const margem = p.margemPercentual;
  return (
    <>
      <section aria-label="Resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          rotulo="Receitas"
          icone="subir"
          tom="roxo"
          valor={p.totalReceitas}
          serie={p.comparativo.map((m) => m.receitas)}
          nota="Linha: últimos 12 meses"
          testId="indicador-Receitas"
        />
        <CartaoNumero
          rotulo="Despesas"
          icone="descer"
          tom="ouro"
          valor={p.totalDespesas}
          serie={p.comparativo.map((m) => m.despesas)}
          nota="Linha: últimos 12 meses"
          testId="indicador-Despesas"
        />
        <CartaoNumero
          rotulo="Resultado"
          icone="contabil"
          tom="sucesso"
          valor={p.resultado}
          serie={p.comparativo.map((m) => m.resultado)}
          nota="Receitas menos despesas"
          testId="indicador-Resultado"
          destaque
        />
        <div className="superficie flex items-center gap-4 rounded-[1.6rem] p-5">
          <Anel
            fracao={margem === null ? 0 : Math.max(0, margem) / 100}
            tom={margem !== null && margem < 0 ? "ouro" : "sucesso"}
            tamanho={76}
            espessura={10}
            rotulo={`Margem do período: ${formatarPorcentagem(margem)}`}
          >
            <Icone nome="porcentagem" width={20} height={20} className="text-sucesso" />
          </Anel>
          <div className="flex flex-col gap-1">
            <span className="text-suave text-sm font-semibold">Margem</span>
            <span
              className={`text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums ${margem !== null && margem < 0 ? "text-perigo" : ""}`}
              data-testid="indicador-Margem"
            >
              {formatarPorcentagem(margem)}
            </span>
            <span className="text-apagado text-xs">do que entrou virou resultado</span>
          </div>
        </div>
      </section>

      <Conferencia painel={p} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao aria-labelledby="titulo-receitas-origem" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-receitas-origem"
            icone="subir"
            titulo="Receitas por origem"
            descricao="De onde veio o dinheiro"
          />
          <Rosca
            rotulo="Receitas por origem"
            testId="grafico-Receitas por origem"
            comTotal
            lado
            tamanho={164}
            partes={Object.entries(ORIGENS_RECEITA).map(([chave, nome]) => ({
              nome,
              valor: p.receitas[chave as keyof Painel["receitas"]],
            }))}
            centro={
              <span className="flex flex-col">
                <span className="text-apagado text-[0.65rem] font-bold tracking-[0.14em] uppercase">
                  Receitas
                </span>
                <span className="text-base font-extrabold tabular-nums">
                  {formatarReais(p.totalReceitas).replace(/,\d+$/, "")}
                </span>
              </span>
            }
          />
        </Cartao>
        <Cartao aria-labelledby="titulo-despesas-tipo" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-despesas-tipo"
            icone="descer"
            tom="ouro"
            titulo="Despesas por tipo"
            descricao="Para onde foi o dinheiro"
          />
          <BarrasHorizontais
            rotulo="Despesas por tipo"
            testId="grafico-Despesas por tipo"
            cor="serie-2"
            linhas={Object.entries(TIPOS_DESPESA).map(
              ([chave, nome]) => [nome, p.despesas[chave as keyof Painel["despesas"]]] as const,
            )}
          />
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao aria-labelledby="titulo-lanchonete" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-lanchonete"
            icone="estoque"
            tom="sucesso"
            titulo="Lanchonete"
            descricao="O que sobrou das vendas depois do custo"
          />
          <div className="flex items-center gap-5">
            <Anel
              fracao={Math.max(0, p.lanchonete.margemPercentual ?? 0) / 100}
              tom="sucesso"
              tamanho={104}
              espessura={10}
              rotulo={`Margem bruta da lanchonete: ${formatarPorcentagem(p.lanchonete.margemPercentual)}`}
            >
              <span className="flex flex-col">
                <span className="text-lg font-extrabold tabular-nums">
                  {formatarPorcentagem(p.lanchonete.margemPercentual)}
                </span>
                <span className="text-apagado text-[0.6rem] font-bold tracking-wider uppercase">
                  margem
                </span>
              </span>
            </Anel>
            <dl
              className="grid flex-1 grid-cols-[1fr_auto] gap-y-2 text-sm"
              data-testid="lanchonete"
            >
              <dt className="text-suave">Vendido</dt>
              <dd className={numero}>{formatarReais(p.lanchonete.vendidoCentavos)}</dd>
              <dt className="text-suave">Custo do vendido</dt>
              <dd className={numero}>{formatarReais(p.lanchonete.custoCentavos)}</dd>
              <dt className="border-borda border-t pt-2 font-semibold">Margem bruta</dt>
              <dd className={`${numero} border-borda border-t pt-2 font-bold`}>
                {formatarReais(p.lanchonete.margemBrutaCentavos)} (
                {formatarPorcentagem(p.lanchonete.margemPercentual)})
              </dd>
            </dl>
          </div>
        </Cartao>
        <Cartao aria-labelledby="titulo-a-receber" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-a-receber"
            icone="relogio"
            tom="areia"
            titulo="A receber"
            descricao="O que ainda não entrou no caixa"
          />
          <dl className="grid gap-3 sm:grid-cols-2" data-testid="a-receber">
            <div className="bg-elevado/40 flex flex-col gap-2 rounded-2xl p-4">
              <dt className="text-suave flex items-center gap-2 text-sm">
                <Icone nome="aulas" width={16} height={16} className="text-roxo-claro" />
                Mensalidades vencidas ({p.aReceber.mensalidades.quantidade}), até hoje
              </dt>
              <dd className="text-2xl font-extrabold">
                <Valor centavos={p.aReceber.mensalidades.valorCentavos} />
              </dd>
            </div>
            <div className="bg-elevado/40 flex flex-col gap-2 rounded-2xl p-4">
              <dt className="text-suave flex items-center gap-2 text-sm">
                <Icone nome="horarios" width={16} height={16} className="text-areia" />
                Reservas não pagas ({p.aReceber.reservas.quantidade}), no período
              </dt>
              <dd className="text-2xl font-extrabold">
                <Valor centavos={p.aReceber.reservas.valorCentavos} />
              </dd>
            </div>
          </dl>
        </Cartao>
      </div>

      <Cartao aria-labelledby="titulo-ocupacao" className="flex flex-col gap-5">
        <CabecalhoCartao
          id="titulo-ocupacao"
          icone="horarios"
          tom="areia"
          titulo="Ocupação das quadras"
          descricao="Horas reservadas sobre horas abertas, sem contar as bloqueadas. As horas abertas seguem os preços e horários de hoje."
        />
        <div className="-mx-1 overflow-x-auto px-1">
          <table
            className="w-full min-w-[36rem] border-separate border-spacing-y-2 text-sm"
            aria-label="Ocupação das quadras"
          >
            <thead>
              <tr className="text-left">
                <th scope="col">Quadra</th>
                {(Object.keys(TURNOS) as Turno[]).map((t) => (
                  <th key={t} scope="col" className="px-2">
                    {TURNOS[t]}
                  </th>
                ))}
                <th scope="col" className="px-2">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {p.ocupacao.map((q) => (
                <tr key={q.id}>
                  <th scope="row" className="pr-2 text-left font-semibold whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <span className="bg-areia/15 text-areia grid size-8 place-items-center rounded-xl">
                        <Icone nome="areia" width={16} height={16} />
                      </span>
                      {q.nome}
                    </span>
                  </th>
                  {(Object.keys(TURNOS) as Turno[]).map((t) => (
                    <td key={t} className="px-2">
                      <Ocupacao dados={q.turnos[t]} nome={`${q.nome}, ${TURNOS[t]}`} />
                    </td>
                  ))}
                  <td className="px-2">
                    <Ocupacao dados={q.total} nome={`${q.nome}, total`} forte />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

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
          descricao="Receitas e despesas de cada mês, regime de caixa"
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <BarrasMensais meses={p.comparativo} />
          <TabelaMensal meses={p.comparativo} />
        </div>
      </Cartao>
    </>
  );
}

/**
 * Conferência com o Caixa: a conta escrita em blocos e um selo que desenha o
 * "check" quando bate (ou mostra o alerta quando não bate).
 */
function Conferencia({ painel: p }: { painel: Painel }) {
  const termos: { rotulo: string; valor: number; sinal?: string }[] = [
    { rotulo: "Resultado", valor: p.resultado },
    { rotulo: "Gaveta (suprimento e sangria)", valor: p.gaveta, sinal: "+" },
    ...(p.naoClassificado !== 0
      ? [{ rotulo: "Outros", valor: p.naoClassificado, sinal: "+" }]
      : []),
    { rotulo: "Entradas", valor: p.entradas, sinal: "=" },
    { rotulo: "Saídas", valor: p.saidas, sinal: "−" },
  ];
  return (
    <section
      aria-label="Conferência com o Caixa"
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
          {p.confere ? "Confere com o Caixa" : "Não confere com o Caixa"}
          <span className="text-suave font-normal">
            {p.confere
              ? ": o resultado e a gaveta fecham com o que entrou e saiu."
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

function Ocupacao({
  dados,
  nome,
  forte = false,
}: {
  dados: OcupacaoTurno;
  nome: string;
  forte?: boolean;
}) {
  const abertas = Math.max(dados.abertas - dados.bloqueadas, 0);
  const fracao = (dados.ocupacaoPercentual ?? 0) / 100;
  return (
    <span className="flex min-w-24 flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className={`tabular-nums ${forte ? "font-extrabold" : "font-semibold"}`}>
          {formatarPorcentagem(dados.ocupacaoPercentual)}
        </span>
        <span className="text-apagado text-xs tabular-nums">
          {dados.reservadas} de {abertas} h
        </span>
      </span>
      <BarraNivel
        fracao={fracao}
        tom={forte ? "ouro" : "areia"}
        altura="h-1.5"
        rotulo={`${nome}: ${formatarPorcentagem(dados.ocupacaoPercentual)} ocupado`}
      />
    </span>
  );
}
