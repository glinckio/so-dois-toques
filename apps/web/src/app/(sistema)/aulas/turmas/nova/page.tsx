import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FormTurma } from "@/components/aulas/form-turma";
import { AcessoNegado, Aviso } from "@/components/ui";
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
      <h1 className="text-2xl font-semibold">Nova turma</h1>
      {locais.dados.every((l) => !l.ativo) ? (
        <Aviso tipo="info">
          Cadastre um local antes.{" "}
          <Link href="/aulas/locais" className="underline">
            Ir para Locais
          </Link>
        </Aviso>
      ) : (
        <FormTurma locais={locais.dados} professores={professores.dados} />
      )}
    </>
  );
}
