import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormAluno } from "@/components/aulas/form-aluno";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { AcessoNegado, Aviso } from "@/components/ui";
import type { AlunoDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Editar aluno | Só Dois Toques" };

export default async function PaginaEditarAluno({
  params,
}: PageProps<"/aulas/alunos/[id]/editar">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { id } = await params;
  const aluno = await chamarApi<AlunoDetalhe>(`/alunos/${encodeURIComponent(id)}`);
  if (!aluno.ok) return <Aviso tipo="erro">{aluno.mensagem}</Aviso>;
  if (aluno.dados.anonimizado)
    return <Aviso tipo="info">Este aluno foi anonimizado e não pode ser alterado.</Aviso>;
  return (
    <>
      <LinkVoltar href={`/aulas/alunos/${aluno.dados.id}`}>Voltar para o aluno</LinkVoltar>
      <Cabecalho
        etiqueta={aluno.dados.nome}
        icone="pessoa"
        titulo={
          <>
            Editar <Destaque>aluno</Destaque>
          </>
        }
        descricao="Contato, emergência e responsável. O consentimento registrado no cadastro continua o mesmo."
      />
      <FormAluno aluno={aluno.dados} />
    </>
  );
}
