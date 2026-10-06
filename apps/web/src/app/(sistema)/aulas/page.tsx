import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AcessoNegado, Aviso, classeBotao } from "@/components/ui";
import { descreverHorarios, NIVEIS } from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Aulas | Só Dois Toques" };

export default async function PaginaTurmas({ searchParams }: PageProps<"/aulas">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { situacao } = await searchParams;
  const encerradas = situacao === "encerradas";
  const resposta = await chamarApi<TurmaResumo[]>(
    `/turmas?situacao=${encerradas ? "encerradas" : "ativas"}`,
  );
  const admin = usuario.perfil === "ADMINISTRADOR";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{admin ? "Turmas" : "Minhas turmas"}</h1>
        {admin && (
          <Link href="/aulas/turmas/nova" className={classeBotao}>
            Nova turma
          </Link>
        )}
      </div>
      <p className="text-sm">
        {encerradas ? (
          <Link href="/aulas" className="underline">
            Ver turmas ativas
          </Link>
        ) : (
          <Link href="/aulas?situacao=encerradas" className="underline">
            Ver turmas encerradas
          </Link>
        )}
      </p>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.length === 0 ? (
        <p className="opacity-80">Nenhuma turma {encerradas ? "encerrada" : "ativa"}.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Turmas">
          {resposta.dados.map((t) => (
            <li key={t.id}>
              <Link
                href={`/aulas/turmas/${t.id}`}
                className="flex h-full flex-col gap-1 rounded-lg border border-current/15 p-4 hover:bg-current/5"
              >
                <h2 className="text-lg font-medium">{t.nome}</h2>
                <p className="text-sm opacity-80">
                  {NIVEIS[t.nivel]} · {t.local.nome} · {t.professor.nome}
                </p>
                <p className="text-sm">{descreverHorarios(t.horarios)}</p>
                <p className="text-sm">
                  {t.ocupadas} de {t.vagas} vagas ocupadas
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
