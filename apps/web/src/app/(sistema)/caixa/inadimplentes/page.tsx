import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Avatar } from "@/components/base/avatar";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { LinkDoCartao } from "@/components/base/cartao";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { PontoVivo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { Aviso } from "@/components/ui";
import { formatarData, formatarTelefone } from "@/lib/aulas/formatacao";
import { competenciaAtual } from "@/lib/mensalidades/formatacao";
import {
  DIAS_DA_BARRA,
  DIAS_DE_ALERTA,
  linkDoWhatsapp,
  nivelDoAtraso,
} from "@/lib/mensalidades/painel";
import type { Inadimplentes } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Inadimplentes | Só Dois Toques" };

/**
 * MENS-CA-14: alunos com mensalidade atrasada, do maior atraso para o menor, com a
 * barra do atraso (marca em 30 dias) e o atalho para conversar no WhatsApp.
 */
export default async function PaginaInadimplentes() {
  await connection();
  const resposta = await chamarApi<Inadimplentes>("/mensalidades/inadimplentes");
  const linkDoMes = `/caixa/mensalidades?competencia=${competenciaAtual()}`;
  const cabecalho = (
    <Cabecalho
      etiqueta="Inadimplentes"
      icone="alerta"
      titulo={
        <>
          Mensalidades em <Destaque>atraso</Destaque>
        </>
      }
      descricao="Quem está com mensalidade vencida, do maior atraso para o menor."
      acoes={<LinkDoCartao href={linkDoMes}>Mensalidades do mês</LinkDoCartao>}
    />
  );
  if (!resposta.ok) {
    return (
      <>
        {cabecalho}
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      </>
    );
  }
  const { itens, totalCentavos } = resposta.dados;
  const mensalidades = itens.reduce((t, i) => t + i.quantidade, 0);
  const maiorAtraso = itens.reduce((m, i) => Math.max(m, i.diasDeAtraso), 0);

  return (
    <>
      {cabecalho}
      {itens.length === 0 ? (
        <Vazio
          titulo="Nenhuma mensalidade atrasada."
          acao={<LinkDoCartao href={linkDoMes}>Ver as mensalidades do mês</LinkDoCartao>}
        >
          Todos os alunos estão em dia com as mensalidades.
        </Vazio>
      ) : (
        <>
          <section
            aria-label="Total em atraso"
            className="border-ouro/30 relative isolate grid grid-cols-1 gap-5 overflow-hidden rounded-[2rem] border bg-linear-to-br from-[#2b2008] via-[#140d26] to-[#120c2b] p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-7"
          >
            <span
              aria-hidden="true"
              className="bg-ouro/15 absolute -top-24 -left-16 -z-10 size-72 rounded-full blur-3xl"
            />
            <div className="flex flex-col gap-2">
              <span className="text-ouro inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] uppercase">
                <PontoVivo tom="ouro" />
                Total em atraso
              </span>
              <NumeroAnimado
                valor={totalCentavos}
                centavosMenores
                className="text-[2.5rem] leading-none font-extrabold tracking-tight sm:text-5xl"
              />
            </div>
            <p className="flex flex-wrap gap-2.5">
              <Contagem valor={itens.length} rotulo={itens.length === 1 ? "aluno" : "alunos"} />
              <Contagem
                valor={mensalidades}
                rotulo={mensalidades === 1 ? "mensalidade" : "mensalidades"}
              />
              <Contagem
                valor={maiorAtraso}
                rotulo={maiorAtraso === 1 ? "dia no maior atraso" : "dias no maior atraso"}
              />
            </p>
          </section>

          <section
            aria-labelledby="titulo-lista-atraso"
            className="superficie rounded-[1.75rem] p-2 sm:p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-2">
              <h2 id="titulo-lista-atraso" className="text-lg font-bold">
                Quem está devendo
              </h2>
              <p className="text-apagado flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="bg-texto/70 inline-block h-3 w-0.5 rounded-full"
                />
                marca de {DIAS_DE_ALERTA} dias · barra cheia em {DIAS_DA_BARRA} dias
              </p>
            </div>
            <ul className="flex flex-col gap-1" aria-label="Inadimplentes">
              {itens.map((i, n) => {
                const atraso = nivelDoAtraso(i.diasDeAtraso);
                const whatsapp = linkDoWhatsapp(i.aluno.telefone);
                return (
                  <li
                    key={i.aluno.id}
                    className={`hover:bg-elevado/45 animate-entrar flex flex-col gap-3 rounded-2xl px-3 py-3.5 transition-colors atraso-${Math.min(24, n + 1)}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar nome={i.aluno.nome} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/caixa/mensalidades?competencia=${i.vencimentoMaisAntigo.slice(0, 7)}&busca=${encodeURIComponent(i.aluno.nome)}`}
                          className="hover:text-roxo-claro truncate font-semibold underline-offset-2 hover:underline"
                        >
                          {i.aluno.nome}
                        </Link>
                        <span className="text-apagado text-sm">
                          {i.quantidade} {i.quantidade === 1 ? "mensalidade" : "mensalidades"} · a
                          mais antiga venceu em {formatarData(i.vencimentoMaisAntigo)}
                        </span>
                      </div>
                      {whatsapp && (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-sucesso/30 bg-sucesso/10 text-sucesso hover:bg-sucesso/20 grid size-11 shrink-0 place-items-center rounded-full border transition duration-200 active:scale-95"
                        >
                          <Icone nome="whatsapp" width={19} height={19} />
                          <span className="sr-only">
                            Conversar com {i.aluno.nome} no WhatsApp (
                            {formatarTelefone(i.aluno.telefone)})
                          </span>
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 pl-13">
                      <div className="min-w-0 flex-1">
                        <BarraNivel
                          fracao={atraso.fracao}
                          marca={DIAS_DE_ALERTA / DIAS_DA_BARRA}
                          tom={atraso.tom}
                          altura="h-2"
                          rotulo={`${i.aluno.nome}: ${atraso.rotulo}`}
                        />
                      </div>
                      <span className="flex shrink-0 flex-col items-end leading-tight">
                        <Valor centavos={i.totalCentavos} className="font-extrabold" />
                        <span
                          className={`text-xs font-semibold ${atraso.tom === "perigo" ? "text-perigo" : "text-ouro"}`}
                        >
                          {atraso.rotulo}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function Contagem({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <span className="bg-noite/35 inline-flex items-baseline gap-1.5 rounded-full border border-white/8 px-3.5 py-2">
      <strong className="text-lg font-extrabold tabular-nums">{valor}</strong>
      <span className="text-apagado text-xs font-semibold">{rotulo}</span>
    </span>
  );
}
