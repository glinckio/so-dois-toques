import type { Metadata } from "next";
import { connection } from "next/server";
import { alternarLocal } from "@/app/acoes/aulas";
import { FormLocal } from "@/components/aulas/form-local";
import { BotaoAcao } from "@/components/botao-acao";
import { AcessoNegado, Aviso } from "@/components/ui";
import { TIPOS_LOCAL } from "@/lib/aulas/formatacao";
import type { Local } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Locais | Só Dois Toques" };

export default async function PaginaLocais() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Local[]>("/locais");
  return (
    <>
      <h1 className="text-2xl font-semibold">Locais</h1>
      <FormLocal />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <ul className="divide-borda flex flex-col divide-y" aria-label="Locais">
          {resposta.dados.map((l) => (
            <li
              key={l.id}
              className={`flex flex-wrap items-center justify-between gap-2 py-3 ${l.ativo ? "" : "opacity-60"}`}
            >
              <span>
                <span className="font-medium">{l.nome}</span>
                <span className="text-suave block text-sm">
                  {TIPOS_LOCAL[l.tipo]}
                  {l.endereco ? ` · ${l.endereco}` : ""}
                  {l.ativo ? "" : " · inativo"}
                </span>
              </span>
              <BotaoAcao
                acao={alternarLocal}
                campos={{
                  id: l.id,
                  nome: l.nome,
                  tipo: l.tipo,
                  endereco: l.endereco ?? "",
                  ativo: String(!l.ativo),
                }}
                rotulo={l.ativo ? "Inativar" : "Reativar"}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
