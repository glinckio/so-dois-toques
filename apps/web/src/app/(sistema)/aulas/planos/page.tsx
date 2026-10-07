import type { Metadata } from "next";
import { connection } from "next/server";
import { FormPlano } from "@/components/mensalidades/form-plano";
import { AcessoNegado, Aviso } from "@/components/ui";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import type { Plano } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Planos | Só Dois Toques" };

export default async function PaginaPlanos() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Plano[]>("/planos");
  return (
    <>
      <h1 className="text-2xl font-semibold">Planos</h1>
      <p className="text-suave">
        Mudar o valor de um plano vale para as mensalidades geradas depois; as já geradas não mudam.
      </p>
      <FormPlano />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.length === 0 ? (
        <p className="text-suave">Nenhum plano cadastrado.</p>
      ) : (
        <ul className="divide-borda flex flex-col divide-y" aria-label="Planos">
          {resposta.dados.map((p) => (
            <li key={p.id} className={`py-3 ${p.ativo ? "" : "text-apagado"}`}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-suave block text-sm">
                      {p.aulasPorSemana}x por semana · {formatarReais(p.valorCentavos)} por mês ·{" "}
                      {p.alunos} {p.alunos === 1 ? "aluno" : "alunos"}
                      {p.ativo ? "" : " · inativo"}
                    </span>
                  </span>
                  <span className="text-sm underline">Editar</span>
                </summary>
                <div className="pt-3">
                  <FormPlano plano={p} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
