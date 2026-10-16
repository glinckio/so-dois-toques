import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormTurma } from "@/components/aulas/form-turma";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Nova turma | Só Dois Toques" };

export default async function PaginaNovaTurma() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  return (
    <>
      <LinkVoltar href="/aulas">Voltar para as turmas</LinkVoltar>
      <Cabecalho
        etiqueta="Aulas"
        icone="aulas"
        titulo={
          <>
            Nova <Destaque>turma</Destaque>
          </>
        }
        descricao="O dia, o horário, o nível e as vagas. Quem treina duas vezes por semana entra em duas turmas."
      />
      <FormTurma />
    </>
  );
}
