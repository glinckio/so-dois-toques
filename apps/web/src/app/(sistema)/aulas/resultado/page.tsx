import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoNegado, Aviso, classeBotaoSecundario } from "@/components/ui";
import type { ResultadoDoMes, Valores } from "@/lib/custos/tipos";
import {
  competenciaAtual,
  competenciaValida,
  deslocarMes,
  formatarReais,
  nomeDoMes,
} from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Resultado das aulas | Só Dois Toques" };

/** CUSTO-CA-05 a 07: receita, custo de quadra e resultado por turma e por professor. */
export default async function PaginaResultado({ searchParams }: PageProps<"/aulas/resultado">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia =
    typeof pedida === "string" && competenciaValida(pedida) ? pedida : competenciaAtual();
  const resposta = await chamarApi<ResultadoDoMes>(`/custos/resultado?competencia=${competencia}`);
  const link = (mes: string) => `/aulas/resultado?competencia=${mes}`;

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Resultado de {nomeDoMes(competencia)}</h1>
        <p className="opacity-80">
          Pelo que entrou e saiu do Caixa no mês. A mensalidade de quem está em mais de uma turma é
          dividida em partes iguais; o custo de cada quadra, pelas horas de cada turma.
        </p>
        <nav aria-label="Mês" className="flex flex-wrap gap-2">
          <Link href={link(deslocarMes(competencia, -1))} className={classeBotaoSecundario}>
            ← {nomeDoMes(deslocarMes(competencia, -1))}
          </Link>
          <Link href={link(deslocarMes(competencia, 1))} className={classeBotaoSecundario}>
            {nomeDoMes(deslocarMes(competencia, 1))} →
          </Link>
        </nav>
      </header>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <>
          <section aria-label="Totais do mês" className="grid gap-3 sm:grid-cols-3">
            <Total rotulo="Receita de mensalidades" valor={resposta.dados.totais.receitaCentavos} />
            <Total rotulo="Custo de quadras" valor={resposta.dados.totais.custoCentavos} />
            <Total rotulo="Resultado" valor={resposta.dados.totais.resultadoCentavos} destaque />
          </section>
          <Tabela
            titulo="Por turma"
            linhas={[
              ...resposta.dados.turmas.map((t) => ({
                chave: t.id,
                nome: t.nome,
                detalhe: `${t.local} · ${t.professor.nome}`,
                valores: t,
              })),
              ...(resposta.dados.semTurma.receitaCentavos !== 0 ||
              resposta.dados.semTurma.custoCentavos !== 0
                ? [
                    {
                      chave: "sem-turma",
                      nome: "Sem turma",
                      detalhe: "Aluno sem matrícula no mês ou quadra sem turma com horas",
                      valores: resposta.dados.semTurma,
                    },
                  ]
                : []),
            ]}
          />
          <Tabela
            titulo="Por professor"
            linhas={resposta.dados.professores.map((p) => ({
              chave: p.id,
              nome: p.nome,
              detalhe: `${p.turmas} ${p.turmas === 1 ? "turma" : "turmas"}`,
              valores: p,
            }))}
          />
        </>
      )}
    </>
  );
}

type Linha = { chave: string; nome: string; detalhe: string; valores: Valores };

function Tabela({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="opacity-80">Nada neste mês.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm" aria-label={titulo}>
            <thead>
              <tr className="border-b border-current/15">
                <th className="py-2 font-medium">Nome</th>
                <th className="py-2 text-right font-medium">Receita</th>
                <th className="py-2 text-right font-medium">Custo</th>
                <th className="py-2 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave} className="border-b border-current/10">
                  <td className="py-2">
                    <span className="font-medium">{l.nome}</span>
                    <span className="block text-xs opacity-80">{l.detalhe}</span>
                  </td>
                  <td className="py-2 text-right">{formatarReais(l.valores.receitaCentavos)}</td>
                  <td className="py-2 text-right">{formatarReais(l.valores.custoCentavos)}</td>
                  <td
                    className={`py-2 text-right font-medium ${l.valores.resultadoCentavos < 0 ? "text-red-700 dark:text-red-400" : ""}`}
                  >
                    {formatarReais(l.valores.resultadoCentavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Total({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-4 ${destaque ? "border-amber-600/50 bg-amber-600/10" : "border-current/15"}`}
    >
      <p className="text-sm opacity-80">{rotulo}</p>
      <p className="text-xl font-semibold">{formatarReais(valor)}</p>
    </div>
  );
}
