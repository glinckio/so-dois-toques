import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { BarrasHorizontais } from "@/components/graficos/barras-horizontais";
import { BarrasMensais } from "@/components/graficos/barras-mensais";
import { TabelaMensal } from "@/components/graficos/tabela-mensal";
import {
  AcessoNegado,
  Aviso,
  classeBotaoSecundario,
  classeCampo,
  classeCartao,
} from "@/components/ui";
import {
  consultaDoPeriodo,
  descreverPeriodo,
  formatarPorcentagem,
  ORIGENS_RECEITA,
  TIPOS_DESPESA,
  TURNOS,
} from "@/lib/contabil/formatacao";
import type { Painel, Turno } from "@/lib/contabil/tipos";
import { competenciaAtual, FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Contábil | Só Dois Toques" };

const classeTabela = "w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5";
const numero = "text-right tabular-nums";

/** CONT-CA-01 a 08: painel do período, só para o administrador (CONT-CA-10). */
export default async function PaginaContabil({ searchParams }: PageProps<"/contabil">) {
  await connection();
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  const parametros = await searchParams;
  const consulta = consultaDoPeriodo(parametros);
  const resposta = await chamarApi<Painel>(`/contabil/painel${consulta ? `?${consulta}` : ""}`);
  const mesEscolhido =
    typeof parametros.competencia === "string" ? parametros.competencia : competenciaAtual();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Contábil</h1>
        <div className="flex flex-wrap items-end gap-4">
          <form className="flex items-end gap-2" action="/contabil" aria-label="Escolher mês">
            <div className="flex flex-col gap-1">
              <label htmlFor="competencia" className="text-sm font-medium">
                Mês
              </label>
              <input
                id="competencia"
                name="competencia"
                type="month"
                defaultValue={mesEscolhido}
                className={classeCampo}
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
            <div className="flex flex-col gap-1">
              <label htmlFor="de" className="text-sm font-medium">
                De
              </label>
              <input
                id="de"
                name="de"
                type="date"
                required
                defaultValue={resposta.ok ? resposta.dados.periodo.de : undefined}
                className={classeCampo}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ate" className="text-sm font-medium">
                Até
              </label>
              <input
                id="ate"
                name="ate"
                type="date"
                required
                defaultValue={resposta.ok ? resposta.dados.periodo.ate : undefined}
                className={classeCampo}
              />
            </div>
            <button type="submit" className={classeBotaoSecundario}>
              Ver período
            </button>
          </form>
        </div>
      </header>
      {resposta.ok ? (
        <Conteudo painel={resposta.dados} consulta={consulta} />
      ) : (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      )}
    </div>
  );
}

function Conteudo({ painel, consulta }: { painel: Painel; consulta: string }) {
  const p = painel;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-suave" data-testid="periodo">
          {descreverPeriodo(p.periodo.de, p.periodo.ate)} · regime de caixa
        </p>
        <a
          href={`/contabil/exportar${consulta ? `?${consulta}` : ""}`}
          className={classeBotaoSecundario}
          download
        >
          Baixar lançamentos (CSV)
        </a>
      </div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Receitas" valor={formatarReais(p.totalReceitas)} />
        <Indicador rotulo="Despesas" valor={formatarReais(p.totalDespesas)} />
        <Indicador rotulo="Resultado" valor={formatarReais(p.resultado)} destaque />
        <Indicador rotulo="Margem" valor={formatarPorcentagem(p.margemPercentual)} />
      </section>

      <Aviso tipo={p.confere ? "sucesso" : "erro"}>
        <span data-testid="conferencia">
          {p.confere ? "Confere com o Caixa" : "Não confere com o Caixa"}: resultado{" "}
          {formatarReais(p.resultado)} + gaveta (suprimento e sangria) {formatarReais(p.gaveta)}
          {p.naoClassificado !== 0 && ` + outros ${formatarReais(p.naoClassificado)}`} = entradas{" "}
          {formatarReais(p.entradas)} − saídas {formatarReais(p.saidas)}.
        </span>
      </Aviso>

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Receitas por origem">
          <BarrasHorizontais
            rotulo="Receitas por origem"
            linhas={Object.entries(ORIGENS_RECEITA).map(
              ([chave, nome]) => [nome, p.receitas[chave as keyof Painel["receitas"]]] as const,
            )}
          />
          <TabelaValores
            rotulo="Receitas por origem"
            linhas={Object.entries(ORIGENS_RECEITA).map(([chave, nome]) => [
              nome,
              p.receitas[chave as keyof Painel["receitas"]],
            ])}
            total={p.totalReceitas}
          />
        </Secao>
        <Secao titulo="Despesas por tipo">
          <BarrasHorizontais
            rotulo="Despesas por tipo"
            cor="serie-2"
            linhas={Object.entries(TIPOS_DESPESA).map(
              ([chave, nome]) => [nome, p.despesas[chave as keyof Painel["despesas"]]] as const,
            )}
          />
          <TabelaValores
            rotulo="Despesas por tipo"
            linhas={Object.entries(TIPOS_DESPESA).map(([chave, nome]) => [
              nome,
              p.despesas[chave as keyof Painel["despesas"]],
            ])}
            total={p.totalDespesas}
          />
        </Secao>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Lanchonete">
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm" data-testid="lanchonete">
            <dt>Vendido</dt>
            <dd className={numero}>{formatarReais(p.lanchonete.vendidoCentavos)}</dd>
            <dt>Custo do vendido</dt>
            <dd className={numero}>{formatarReais(p.lanchonete.custoCentavos)}</dd>
            <dt className="font-medium">Margem bruta</dt>
            <dd className={`${numero} font-medium`}>
              {formatarReais(p.lanchonete.margemBrutaCentavos)} (
              {formatarPorcentagem(p.lanchonete.margemPercentual)})
            </dd>
          </dl>
        </Secao>
        <Secao titulo="A receber">
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm" data-testid="a-receber">
            <dt>Mensalidades vencidas ({p.aReceber.mensalidades.quantidade}), até hoje</dt>
            <dd className={numero}>{formatarReais(p.aReceber.mensalidades.valorCentavos)}</dd>
            <dt>Reservas não pagas ({p.aReceber.reservas.quantidade}), no período</dt>
            <dd className={numero}>{formatarReais(p.aReceber.reservas.valorCentavos)}</dd>
          </dl>
        </Secao>
      </div>

      <Secao titulo="Ocupação das quadras">
        <div className="overflow-x-auto">
          <table className={classeTabela} aria-label="Ocupação das quadras">
            <thead>
              <tr className="text-left">
                <th scope="col">Quadra</th>
                {(Object.keys(TURNOS) as Turno[]).map((t) => (
                  <th key={t} scope="col" className={numero}>
                    {TURNOS[t]}
                  </th>
                ))}
                <th scope="col" className={numero}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {p.ocupacao.map((q) => (
                <tr key={q.id} className="border-borda border-t">
                  <th scope="row" className="text-left font-medium">
                    {q.nome}
                  </th>
                  {(Object.keys(TURNOS) as Turno[]).map((t) => (
                    <td key={t} className={numero}>
                      <Ocupacao dados={q.turnos[t]} />
                    </td>
                  ))}
                  <td className={numero}>
                    <Ocupacao dados={q.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-suave text-sm">
          Horas reservadas sobre horas abertas, sem contar as bloqueadas. As horas abertas seguem os
          preços e horários de hoje.
        </p>
      </Secao>

      <Secao titulo="Formas de pagamento">
        <div className="overflow-x-auto">
          <table className={classeTabela} aria-label="Formas de pagamento">
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
              {(Object.keys(FORMAS) as (keyof typeof FORMAS)[]).map((forma) => (
                <tr key={forma} className="border-borda border-t">
                  <th scope="row" className="text-left font-normal">
                    {FORMAS[forma]}
                  </th>
                  <td className={numero}>{formatarReais(p.porForma[forma].entradas)}</td>
                  <td className={numero}>{formatarReais(p.porForma[forma].saidas)}</td>
                  <td className={numero}>{formatarReais(p.porForma[forma].saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Últimos 12 meses">
        <BarrasMensais meses={p.comparativo} />
        <TabelaMensal meses={p.comparativo} />
      </Secao>
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={`${classeCartao} flex flex-col gap-4`} aria-label={titulo}>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border p-4 ${destaque ? "border-roxo/50 bg-roxo-forte/15" : "border-borda bg-cartao"}`}
    >
      <span className="text-suave text-sm">{rotulo}</span>
      <span className="text-xl font-semibold tabular-nums" data-testid={`indicador-${rotulo}`}>
        {valor}
      </span>
    </div>
  );
}

function TabelaValores({
  rotulo,
  linhas,
  total,
}: {
  rotulo: string;
  linhas: [string, number][];
  total: number;
}) {
  return (
    <table className={classeTabela} aria-label={rotulo}>
      <tbody>
        {linhas.map(([nome, valor]) => (
          <tr key={nome} className="border-borda border-b">
            <th scope="row" className="text-left font-normal">
              {nome}
            </th>
            <td className={numero}>{formatarReais(valor)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row" className="text-left font-semibold">
            Total
          </th>
          <td className={`${numero} font-semibold`}>{formatarReais(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Ocupacao({
  dados,
}: {
  dados: {
    reservadas: number;
    abertas: number;
    bloqueadas: number;
    ocupacaoPercentual: number | null;
  };
}) {
  return (
    <span className="flex flex-col items-end">
      <span className="font-medium">{formatarPorcentagem(dados.ocupacaoPercentual)}</span>
      <span className="text-suave text-xs">
        {dados.reservadas} de {Math.max(dados.abertas - dados.bloqueadas, 0)} h
      </span>
    </span>
  );
}
