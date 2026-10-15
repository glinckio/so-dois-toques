import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormTurma } from "@/components/aulas/form-turma";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { AcessoNegado, Aviso } from "@/components/ui";
import type { Professor } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Nova turma | Só Dois Toques" };

export default async function PaginaNovaTurma() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const professores = await chamarApi<Professor[]>("/professores");
  if (!professores.ok) return <Aviso tipo="erro">Não foi possível carregar os professores.</Aviso>;
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
        descricao="O nível, quem dá a aula, quantas vagas e os dias da semana. Duas turmas não dividem o mesmo horário da quadra."
      />
      <FormTurma professores={professores.dados} />
    </>
  );
}
