import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormAluno } from "@/components/aulas/form-aluno";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Novo aluno | Só Dois Toques" };

export default async function PaginaNovoAluno() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  return (
    <>
      <LinkVoltar href="/aulas/alunos">Voltar para os alunos</LinkVoltar>
      <Cabecalho
        etiqueta="Aulas"
        icone="pessoa"
        titulo={
          <>
            Novo <Destaque>aluno</Destaque>
          </>
        }
        descricao="Contato, quem avisar numa emergência e, para menores de 18 anos, o responsável."
      />
      <FormAluno />
    </>
  );
}
