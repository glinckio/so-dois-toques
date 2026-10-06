import type { Metadata } from "next";
import { connection } from "next/server";
import { BotaoImprimir } from "@/components/mensalidades/botao-imprimir";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { nomeDaCategoria } from "@/lib/caixa/formatacao";
import type { Turno } from "@/lib/caixa/tipos";
import { FORMAS, formatarReais, type Forma } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Turno do caixa | Só Dois Toques" };

/** CAIXA-CA-05: relatório do turno, para conferir e imprimir. */
export default async function PaginaTurno({
  params,
  searchParams,
}: PageProps<"/caixa/turnos/[id]">) {
  await connection();
  const { id } = await params;
  const { fechado } = await searchParams;
  const resposta = await chamarApi<Turno>(`/caixa/sessoes/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const t = resposta.dados;
  const linhas: [string, string][] = [
    ["Aberto por", `${t.abertaPor} em ${formatarDataHora(t.abertaEm)}`],
    ["Fechado por", t.fechadaEm ? `${t.fechadaPor} em ${formatarDataHora(t.fechadaEm)}` : "Aberto"],
    ["Troco inicial", formatarReais(t.trocoInicialCentavos)],
    ["Esperado em dinheiro", formatarReais(t.esperadoDinheiroCentavos)],
    ...(t.contadoDinheiroCentavos !== null
      ? ([
          ["Dinheiro contado", formatarReais(t.contadoDinheiroCentavos)],
          ["Diferença", formatarReais(t.diferencaCentavos ?? 0)],
        ] as [string, string][])
      : []),
    ...(t.observacao ? ([["Observação", t.observacao]] as [string, string][]) : []),
  ];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Turno do caixa</h1>
        <BotaoImprimir />
      </header>
      {fechado === "1" && (
        <Aviso tipo={t.diferencaCentavos === 0 ? "sucesso" : "info"}>
          Caixa fechado.{" "}
          {t.diferencaCentavos === 0
            ? "O dinheiro bateu."
            : `Diferença de ${formatarReais(t.diferencaCentavos ?? 0)}.`}
        </Aviso>
      )}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]" aria-label="Resumo do turno">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-sm opacity-80">{rotulo}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Por forma de pagamento</h2>
        <Tabela
          colunas={["Forma", "Entradas", "Saídas", "Saldo"]}
          linhas={(Object.keys(FORMAS) as Forma[]).map((f) => [
            FORMAS[f],
            formatarReais(t.resumo.porForma[f].entradas),
            formatarReais(t.resumo.porForma[f].saidas),
            formatarReais(t.resumo.porForma[f].saldo),
          ])}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Por categoria</h2>
        {t.porCategoria.length === 0 ? (
          <p className="opacity-80">Nenhum lançamento no turno.</p>
        ) : (
          <Tabela
            colunas={["Categoria", "Entradas", "Saídas"]}
            linhas={t.porCategoria.map((c) => [
              nomeDaCategoria(c.categoria),
              formatarReais(c.entradas),
              formatarReais(c.saidas),
            ])}
          />
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Lançamentos</h2>
        {t.lancamentos.length === 0 ? (
          <p className="opacity-80">Nenhum lançamento no turno.</p>
        ) : (
          <ul
            className="flex flex-col divide-y divide-current/10"
            aria-label="Lançamentos do turno"
          >
            {t.lancamentos.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className={l.estornado ? "line-through opacity-70" : ""}>
                    {l.descricao}
                  </span>
                  <span className="block text-sm opacity-80">
                    {nomeDaCategoria(l.categoria)} · {FORMAS[l.forma]} · {l.criadoPor} ·{" "}
                    {formatarDataHora(l.criadoEm)}
                  </span>
                </span>
                <span className="font-medium">
                  {l.tipo === "SAIDA" ? "− " : "+ "}
                  {formatarReais(l.valorCentavos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-current/15">
          {colunas.map((c, i) => (
            <th key={c} className={`py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha[0]} className="border-b border-current/10">
            {linha.map((celula, i) => (
              <td key={i} className={`py-2 ${i > 0 ? "text-right" : ""}`}>
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
