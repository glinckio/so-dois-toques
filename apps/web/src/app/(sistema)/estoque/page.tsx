import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FormProduto } from "@/components/estoque/form-produto";
import { Aviso } from "@/components/ui";
import type { Produto } from "@/lib/estoque/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Estoque | Só Dois Toques" };

/** ESTQ-CA-07: produtos com saldo, custo médio e alerta de mínimo. */
export default async function PaginaEstoque() {
  await connection();
  const { usuario } = await exigirArea("estoque");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const resposta = await chamarApi<Produto[]>("/produtos");
  const acabando = resposta.ok ? resposta.dados.filter((p) => p.abaixoDoMinimo) : [];

  return (
    <>
      <h1 className="text-2xl font-semibold">Estoque da lanchonete</h1>
      {acabando.length > 0 && (
        <Aviso tipo="info">
          Abaixo do mínimo: {acabando.map((p) => `${p.nome} (${p.saldo})`).join(", ")}.
        </Aviso>
      )}
      {admin && <FormProduto />}
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.length === 0 ? (
        <p className="opacity-80">Nenhum produto cadastrado.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-current/10" aria-label="Produtos">
          {resposta.dados.map((p) => (
            <li
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-2 py-3 ${p.ativo ? "" : "opacity-70"}`}
            >
              <span>
                <Link href={`/estoque/produtos/${p.id}`} className="font-medium underline">
                  {p.nome}
                </Link>
                <span className="block text-sm opacity-80">
                  {formatarReais(p.precoCentavos)} · custo médio{" "}
                  {formatarReais(p.custoMedioCentavos)} · mínimo {p.estoqueMinimo}
                  {p.ativo ? "" : " · inativo"}
                </span>
              </span>
              <span
                className={`font-semibold ${p.abaixoDoMinimo ? "text-red-700 dark:text-red-400" : ""}`}
              >
                {p.saldo} {p.saldo === 1 ? "unidade" : "unidades"}
                {p.abaixoDoMinimo && " · repor"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
