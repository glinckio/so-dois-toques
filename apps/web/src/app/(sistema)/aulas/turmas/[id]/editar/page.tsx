import type { Metadata } from "next";
import { connection } from "next/server";
import { FormTurma } from "@/components/aulas/form-turma";
import { AcessoNegado, Aviso } from "@/components/ui";
import type { Local, Professor, TurmaDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Editar turma | Só Dois Toques" };

export default async function PaginaEditarTurma({
  params,
}: PageProps<"/aulas/turmas/[id]/editar">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { id } = await params;
  const [turma, locais, professores] = await Promise.all([
    chamarApi<TurmaDetalhe>(`/turmas/${encodeURIComponent(id)}`),
    chamarApi<Local[]>("/locais"),
    chamarApi<Professor[]>("/professores"),
  ]);
  if (!turma.ok) return <Aviso tipo="erro">{turma.mensagem}</Aviso>;
  if (!locais.ok || !professores.ok)
    return <Aviso tipo="erro">Não foi possível carregar locais e professores.</Aviso>;
  return (
    <>
      <h1 className="text-2xl font-semibold">Editar turma</h1>
      <FormTurma turma={turma.dados} locais={locais.dados} professores={professores.dados} />
    </>
  );
}
