import type { Metadata } from "next";
import { connection } from "next/server";
import { FormAluno } from "@/components/aulas/form-aluno";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Novo aluno | Só Dois Toques" };

export default async function PaginaNovoAluno() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  return (
    <>
      <h1 className="text-2xl font-semibold">Novo aluno</h1>
      <FormAluno />
    </>
  );
}
