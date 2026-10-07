import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { FormTurma } from "@/components/aulas/form-turma";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { AcessoNegado, Aviso, classeBotao } from "@/components/ui";
import type { Local, Professor } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Nova turma | Só Dois Toques" };

export default async function PaginaNovaTurma() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const [locais, professores] = await Promise.all([
    chamarApi<Local[]>("/locais"),
    chamarApi<Professor[]>("/professores"),
  ]);
  if (!locais.ok || !professores.ok)
    return <Aviso tipo="erro">Não foi possível carregar locais e professores.</Aviso>;
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
        descricao="O nível, onde treina, quem dá a aula, quantas vagas e os dias da semana."
      />
      {locais.dados.every((l) => !l.ativo) ? (
        <Vazio
          titulo="Cadastre um local antes."
          acao={
            <Link href="/aulas/locais" className={classeBotao}>
              <Icone nome="local" width={18} height={18} />
              Ir para Locais
            </Link>
          }
        >
          A turma precisa de uma quadra, própria ou parceira.
        </Vazio>
      ) : (
        <FormTurma locais={locais.dados} professores={professores.dados} />
      )}
    </>
  );
}
