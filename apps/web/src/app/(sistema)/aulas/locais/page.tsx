import type { Metadata } from "next";
import { connection } from "next/server";
import { alternarLocal } from "@/app/acoes/aulas";
import { FormLocal } from "@/components/aulas/form-local";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { LinkDoCartao } from "@/components/base/cartao";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { Icone } from "@/components/icones";
import { AcessoNegado, Aviso, classeBotaoFantasma } from "@/components/ui";
import { TIPOS_LOCAL } from "@/lib/aulas/formatacao";
import type { Local } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Locais | Só Dois Toques" };

/** Locais das aulas em cartões (própria em roxo, parceira em dourado) e o cadastro ao lado. */
export default async function PaginaLocais() {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Local[]>("/locais");
  const ativos = resposta.ok ? resposta.dados.filter((l) => l.ativo) : [];
  const parceiras = ativos.filter((l) => l.tipo === "PARCEIRA").length;
  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="local"
        titulo={
          <>
            Locais das <Destaque>aulas</Destaque>
          </>
        }
        descricao={
          resposta.ok
            ? `${ativos.length} ${ativos.length === 1 ? "local ativo" : "locais ativos"}, ${parceiras} ${parceiras === 1 ? "parceira" : "parceiras"}. O custo das parceiras sai em Custos.`
            : undefined
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {!resposta.ok ? (
          <Aviso tipo="erro">{resposta.mensagem}</Aviso>
        ) : resposta.dados.length === 0 ? (
          <Vazio titulo="Nenhum local cadastrado.">
            Cadastre a quadra própria e as parceiras para montar as turmas.
          </Vazio>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Locais">
            {resposta.dados.map((l, i) => {
              const parceira = l.tipo === "PARCEIRA";
              return (
                <li
                  key={l.id}
                  className={`superficie animate-entrar flex flex-col gap-4 rounded-[1.6rem] p-5 atraso-${Math.min(24, i)} ${l.ativo ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start gap-3">
                    <SeloIcone
                      nome={parceira ? "local" : "inicio"}
                      tom={parceira ? "ouro" : "roxo"}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-lg leading-tight font-bold">{l.nome}</span>
                      <span className="flex flex-wrap gap-1.5">
                        <Selo tom={parceira ? "ouro" : "roxo"} semPonto>
                          {TIPOS_LOCAL[l.tipo]}
                        </Selo>
                        {!l.ativo && <Selo tom="neutro">inativo</Selo>}
                      </span>
                    </div>
                  </div>
                  <p className="text-suave flex items-start gap-2 text-sm">
                    <Icone
                      nome="local"
                      width={15}
                      height={15}
                      className="text-apagado mt-0.5 shrink-0"
                    />
                    {l.endereco || "Sem endereço cadastrado"}
                  </p>
                  <div className="border-borda mt-auto flex items-center justify-between gap-2 border-t pt-3">
                    {parceira && l.ativo ? (
                      <LinkDoCartao href="/aulas/custos">Ver custos</LinkDoCartao>
                    ) : (
                      <span />
                    )}
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
                      className={classeBotaoFantasma}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="max-lg:order-first lg:sticky lg:top-6">
          <FormLocal />
        </div>
      </div>
    </>
  );
}
