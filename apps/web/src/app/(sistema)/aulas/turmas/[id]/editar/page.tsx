import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormTurma } from "@/components/aulas/form-turma";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
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
      <LinkVoltar href={`/aulas/turmas/${turma.dados.id}`}>Voltar para a turma</LinkVoltar>
      <Cabecalho
        etiqueta={turma.dados.nome}
        icone="aulas"
        titulo={
          <>
            Editar <Destaque>turma</Destaque>
          </>
        }
        descricao="Nome, nível, local, professor, vagas e os dias e horários da turma."
      />
      <FormTurma turma={turma.dados} locais={locais.dados} professores={professores.dados} />
    </>
  );
}
