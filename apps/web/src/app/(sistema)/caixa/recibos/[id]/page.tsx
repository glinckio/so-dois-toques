import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Bola } from "@/components/base/bola";
import { LinkDoCartao } from "@/components/base/cartao";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { Selo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Icone } from "@/components/icones";
import { BotaoImprimir } from "@/components/mensalidades/botao-imprimir";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData } from "@/lib/aulas/formatacao";
import { FORMAS, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { Recibo } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Recibo | Só Dois Toques" };

/**
 * MENS-CA-11: recibo desenhado como comprovante (picote e linhas tracejadas), para
 * imprimir ou salvar em PDF pelo navegador; no papel sai em branco e preto.
 */
export default async function PaginaRecibo({
  params,
  searchParams,
}: PageProps<"/caixa/recibos/[id]">) {
  await connection();
  const { id } = await params;
  const { novo } = await searchParams;
  const resposta = await chamarApi<Recibo>(`/pagamentos/${encodeURIComponent(id)}/recibo`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const r = resposta.dados;
  const linhas: [string, ReactNode][] = [
    ["Aluno", r.aluno],
    ["Referente a", `Mensalidade de ${nomeDoMes(r.competencia)}`],
    [
      "Forma",
      <span key="forma" className="inline-flex items-center gap-1.5">
        <Icone nome={ICONES_DAS_FORMAS[r.forma] ?? "dinheiro"} width={15} height={15} />
        {FORMAS[r.forma]}
      </span>,
    ],
    ["Data do pagamento", formatarData(r.data)],
    ["Recebido por", r.recebidoPor],
    ["Registrado em", formatarDataHora(r.recebidoEm)],
  ];

  return (
    <>
      {novo && (
        <div className="print:hidden">
          <Aviso tipo="sucesso">Pagamento registrado.</Aviso>
        </div>
      )}

      <div className="flex justify-center print:block">
        <article
          aria-label={`Recibo nº ${r.numero}`}
          className="superficie relative w-full max-w-md rounded-[1.75rem] print:max-w-none print:border-black/40"
        >
          {r.estornado && (
            <span
              aria-hidden="true"
              className="border-perigo/70 text-perigo pointer-events-none absolute top-24 right-6 rotate-[-14deg] rounded-xl border-[3px] px-3 py-1 text-xl font-black tracking-[0.2em] uppercase opacity-80 print:border-black print:text-black"
            >
              Estornado
            </span>
          )}

          <div className="flex flex-col gap-5 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <Bola tamanho={40} />
                <span className="flex flex-col leading-tight">
                  <span className="font-extrabold">Só Dois Toques</span>
                  <span className="text-apagado text-[0.68rem] font-bold tracking-[0.16em] uppercase">
                    São Leopoldo
                  </span>
                </span>
              </span>
              <Selo tom={r.estornado ? "perigo" : "sucesso"} className="print:text-black">
                {r.estornado ? "Estornado" : "Pago"}
              </Selo>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-apagado text-xs font-bold tracking-[0.16em] uppercase">
                Recibo nº <span className="text-texto text-base tracking-normal">{r.numero}</span>
              </h1>
              <Valor
                centavos={r.valorCentavos}
                className={`text-[2.75rem] leading-none font-extrabold tracking-tight ${r.estornado ? "text-apagado line-through" : ""}`}
              />
            </div>
          </div>

          <div aria-hidden="true" className="relative flex h-7 items-center">
            <span className="bg-noite border-borda absolute -left-3.5 size-7 rounded-full border [clip-path:inset(0_0_0_50%)] print:border-black/40" />
            <span className="border-borda mx-6 h-0 flex-1 border-t-2 border-dashed print:border-black/40" />
            <span className="bg-noite border-borda absolute -right-3.5 size-7 rounded-full border [clip-path:inset(0_50%_0_0)] print:border-black/40" />
          </div>

          <div className="flex flex-col gap-5 p-6 pt-4 sm:p-7 sm:pt-4">
            {r.estornado && <Aviso tipo="erro">Este pagamento foi estornado.</Aviso>}
            <p className="text-suave leading-relaxed">
              Recebemos de <strong className="text-texto">{r.aluno}</strong> a quantia de{" "}
              <strong className="text-texto whitespace-nowrap">
                {formatarReais(r.valorCentavos)}
              </strong>
              , referente à mensalidade de {nomeDoMes(r.competencia)}.
            </p>
            <dl className="flex flex-col text-sm">
              {linhas.map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  className="border-borda flex items-baseline justify-between gap-4 border-b border-dashed py-2.5 last:border-b-0 print:border-black/30"
                >
                  <dt className="text-apagado shrink-0">{rotulo}</dt>
                  <dd className="min-w-0 text-right font-semibold break-words">{valor}</dd>
                </div>
              ))}
            </dl>
            <p className="text-apagado border-borda flex items-center justify-between gap-3 border-t-2 border-dashed pt-4 text-xs print:border-black/30">
              <span>Guarde este comprovante.</span>
              <span className="font-mono tracking-wider">
                Código {r.id.slice(0, 8).toUpperCase()}
              </span>
            </p>
          </div>
        </article>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <BotaoImprimir />
        <LinkDoCartao href={`/caixa/mensalidades?competencia=${r.competencia}`}>
          Mensalidades de {nomeDoMes(r.competencia).split(" de ")[0]}
        </LinkDoCartao>
      </div>
    </>
  );
}
