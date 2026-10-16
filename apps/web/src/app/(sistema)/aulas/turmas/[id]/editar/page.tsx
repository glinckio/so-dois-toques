import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormTurma } from "@/components/aulas/form-turma";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { AcessoNegado, Aviso } from "@/components/ui";
import type { TurmaDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";
import type { Quadra } from "@/lib/horarios/tipos";

export const metadata: Metadata = { title: "Editar turma | Só Dois Toques" };

export default async function PaginaEditarTurma({
  params,
}: PageProps<"/aulas/turmas/[id]/editar">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { id } = await params;
  const [turma, quadras] = await Promise.all([
    chamarApi<TurmaDetalhe>(`/turmas/${encodeURIComponent(id)}`),
    chamarApi<Quadra[]>("/horarios/quadras"),
  ]);
  if (!turma.ok) return <Aviso tipo="erro">{turma.mensagem}</Aviso>;
  if (!quadras.ok) return <Aviso tipo="erro">{quadras.mensagem}</Aviso>;
  return (
    <>
      <LinkVoltar href={`/aulas/turmas/${turma.dados.id}`}>Voltar para a turma</LinkVoltar>
      <Cabecalho
        etiqueta={turma.dados.descricao}
        icone="aulas"
        titulo={
          <>
            Editar <Destaque>turma</Destaque>
          </>
        }
        descricao="Quadra, dia, horário, nível e vagas da turma."
      />
      <FormTurma
        turma={turma.dados}
        quadras={quadras.dados.filter((q) => q.ativa || q.id === turma.dados.quadraId)}
      />
    </>
  );
}
