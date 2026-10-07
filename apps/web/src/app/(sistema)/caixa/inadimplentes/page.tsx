import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso } from "@/components/ui";
import { formatarData, formatarTelefone } from "@/lib/aulas/formatacao";
import { competenciaAtual, formatarReais } from "@/lib/mensalidades/formatacao";
import type { Inadimplentes } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Inadimplentes | Só Dois Toques" };

/** MENS-CA-14: alunos com mensalidade atrasada, do maior atraso para o menor. */
export default async function PaginaInadimplentes() {
  await connection();
  const resposta = await chamarApi<Inadimplentes>("/mensalidades/inadimplentes");
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const { itens, totalCentavos } = resposta.dados;
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Inadimplentes</h1>
        <p className="text-suave">
          {itens.length === 0
            ? "Nenhuma mensalidade atrasada."
            : `${itens.length} ${itens.length === 1 ? "aluno" : "alunos"} · ${formatarReais(totalCentavos)} em atraso`}
        </p>
      </header>
      {itens.length > 0 && (
        <ul className="divide-borda flex flex-col divide-y" aria-label="Inadimplentes">
          {itens.map((i) => (
            <li key={i.aluno.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span>
                <Link
                  href={`/caixa/mensalidades?competencia=${i.vencimentoMaisAntigo.slice(0, 7)}&busca=${encodeURIComponent(i.aluno.nome)}`}
                  className="font-medium underline"
                >
                  {i.aluno.nome}
                </Link>
                <span className="text-suave block text-sm">
                  {formatarTelefone(i.aluno.telefone)} · {i.quantidade}{" "}
                  {i.quantidade === 1 ? "mensalidade" : "mensalidades"} · a mais antiga venceu em{" "}
                  {formatarData(i.vencimentoMaisAntigo)}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-medium">{formatarReais(i.totalCentavos)}</span>
                <span className="text-perigo dark:text-perigo text-sm">
                  {i.diasDeAtraso} {i.diasDeAtraso === 1 ? "dia" : "dias"} de atraso
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-apagado text-sm">
        Mês atual:{" "}
        <Link href={`/caixa/mensalidades?competencia=${competenciaAtual()}`} className="underline">
          ver mensalidades
        </Link>
      </p>
    </>
  );
}
