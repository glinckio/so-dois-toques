import type { Metadata } from "next";
import { connection } from "next/server";
import { BotaoImprimir } from "@/components/mensalidades/botao-imprimir";
import { Aviso } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import { FORMAS, formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { Recibo } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Recibo | Só Dois Toques" };

/** MENS-CA-11: recibo para imprimir ou salvar em PDF pelo navegador. */
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
  return (
    <>
      {novo && (
        <div className="print:hidden">
          <Aviso tipo="sucesso">Pagamento registrado.</Aviso>
        </div>
      )}
      <article
        aria-label={`Recibo nº ${r.numero}`}
        className="border-borda mx-auto flex w-full max-w-lg flex-col gap-4 rounded-lg border p-6 print:border-black"
      >
        <header className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">Recibo nº {r.numero}</h1>
          <span className="text-sm">Só Dois Toques</span>
        </header>
        {r.estornado && <Aviso tipo="erro">Este pagamento foi estornado.</Aviso>}
        <p>
          Recebemos de <strong>{r.aluno}</strong> a quantia de{" "}
          <strong>{formatarReais(r.valorCentavos)}</strong>, referente à mensalidade de{" "}
          {nomeDoMes(r.competencia)}.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-apagado">Forma</dt>
          <dd>{FORMAS[r.forma]}</dd>
          <dt className="text-apagado">Data do pagamento</dt>
          <dd>{formatarData(r.data)}</dd>
          <dt className="text-apagado">Recebido por</dt>
          <dd>{r.recebidoPor}</dd>
        </dl>
      </article>
      <div className="mx-auto">
        <BotaoImprimir />
      </div>
    </>
  );
}
