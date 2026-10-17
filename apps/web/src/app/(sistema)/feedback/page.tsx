import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  marcarFeedbackLido,
  marcarTodosFeedbacksLidos,
  pausarFeedback,
  removerFeedback,
} from "@/app/acoes/feedback";
import { BotaoAcao } from "@/components/botao-acao";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { CopiarLink } from "@/components/feedback/copiar-link";
import { Estrelas } from "@/components/feedback/estrelas";
import {
  AcessoNegado,
  Aviso,
  classeBotao,
  classeBotaoFantasma,
  classeBotaoPerigo,
  classeBotaoSecundario,
  classeCampo,
  classeCartao,
  classeRotulo,
} from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData } from "@/lib/aulas/formatacao";
import {
  filtroDoPainel,
  formatarMedia,
  NOTAS,
  partesDaDistribuicao,
  quantasRespostas,
  ROTULOS_DAS_NOTAS,
  type PainelFeedback,
} from "@/lib/feedback/painel";
import { nomeDoMes } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Feedback | Só Dois Toques" };

const classeBotaoPequeno = "!min-h-10 !px-4 text-sm";

/**
 * FEED-CA-04 a 07: o que os alunos acham das aulas. Média, distribuição e média mensal;
 * lista das respostas com marcar como lida e remover; link do formulário e pausa.
 */
export default async function PaginaFeedback({ searchParams }: PageProps<"/feedback">) {
  await connection();
  const { permitido } = await exigirArea("feedback");
  if (!permitido) return <AcessoNegado />;
  const { filtro, consulta } = filtroDoPainel(await searchParams);
  const resposta = await chamarApi<PainelFeedback>(`/feedback/painel?${consulta.toString()}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const p = resposta.dados;
  const maiorMes = Math.max(1, ...p.mensal.map((m) => m.quantidade));

  return (
    <>
      <Cabecalho
        etiqueta="Gestão"
        icone="feedback"
        titulo={
          <>
            Feedback dos <Destaque>alunos</Destaque>
          </>
        }
        descricao="O que os alunos estão achando das aulas e o que pode melhorar."
        acoes={
          p.naoLidas > 0 && (
            <BotaoAcao
              acao={marcarTodosFeedbacksLidos}
              campos={{}}
              rotulo={`Marcar ${p.naoLidas === 1 ? "1 nova" : `${p.naoLidas} novas`} como lidas`}
            />
          )
        }
      />

      <Cartao aria-labelledby="titulo-link" className="flex flex-col gap-4">
        <CabecalhoCartao
          id="titulo-link"
          icone="whatsapp"
          titulo="Link do formulário"
          descricao="Mande no grupo da turma, no Instagram ou imprima na quadra. Abre sem login."
          acao={
            <Selo tom={p.pausado ? "areia" : "sucesso"}>
              {p.pausado ? "Pausado" : "Recebendo respostas"}
            </Selo>
          }
        />
        <CopiarLink caminho="/avaliar" />
        <div className="flex flex-wrap items-center gap-3">
          <BotaoAcao
            acao={pausarFeedback}
            campos={{ pausado: p.pausado ? "false" : "true" }}
            rotulo={p.pausado ? "Retomar o formulário" : "Pausar o formulário"}
            confirmar={
              p.pausado
                ? undefined
                : "Pausar o formulário? Quem abrir o link verá que não estamos recebendo respostas."
            }
          />
          <Link href="/avaliar" target="_blank" className={classeBotaoFantasma}>
            Ver o formulário
          </Link>
        </div>
      </Cartao>

      <form
        action="/feedback"
        aria-label="Filtrar respostas"
        className={`${classeCartao} grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_1fr]`}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="de" className={classeRotulo}>
            De
          </label>
          <input
            id="de"
            name="de"
            type="date"
            defaultValue={p.periodo.de}
            className={classeCampo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ate" className={classeRotulo}>
            Até
          </label>
          <input
            id="ate"
            name="ate"
            type="date"
            defaultValue={p.periodo.ate}
            className={classeCampo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="turmaId" className={classeRotulo}>
            Turma
          </label>
          <select
            id="turmaId"
            name="turmaId"
            defaultValue={filtro.turmaId ?? ""}
            className={classeCampo}
          >
            <option value="">Todas</option>
            {p.turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ativa ? t.descricao : `${t.descricao} (encerrada)`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nota" className={classeRotulo}>
            Nota
          </label>
          <select
            id="nota"
            name="nota"
            defaultValue={filtro.nota ? String(filtro.nota) : ""}
            className={classeCampo}
          >
            <option value="">Todas</option>
            {[...NOTAS].reverse().map((n) => (
              <option key={n} value={n}>
                {n} · {ROTULOS_DAS_NOTAS[n]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={classeBotao}>
            Filtrar
          </button>
          <Link href="/feedback" className={classeBotaoSecundario}>
            Limpar
          </Link>
        </div>
      </form>

      <section aria-labelledby="titulo-resumo" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <h2 id="titulo-resumo" className="sr-only">
          Resumo de {formatarData(p.periodo.de)} a {formatarData(p.periodo.ate)}
        </h2>
        <Cartao variante="destaque" className="flex flex-col gap-3" data-testid="media-feedback">
          <span className="text-suave text-sm font-semibold">Nota média</span>
          <span className="text-5xl font-extrabold tabular-nums">
            {formatarMedia(p.resumo.media)}
          </span>
          {p.resumo.media !== null && <Estrelas nota={p.resumo.media} tamanho={22} />}
          <span className="text-apagado text-sm">
            {quantasRespostas(p.resumo.quantidade)} de {formatarData(p.periodo.de)} a{" "}
            {formatarData(p.periodo.ate)}
            {p.naoLidas > 0 && ` · ${p.naoLidas} não lida${p.naoLidas === 1 ? "" : "s"} no total`}
          </span>
        </Cartao>

        <Cartao className="flex flex-col gap-3">
          <span className="text-suave text-sm font-semibold">Notas</span>
          <table className="w-full text-sm" aria-label="Distribuição das notas">
            <tbody>
              {partesDaDistribuicao(p.resumo.distribuicao).map((parte) => (
                <tr key={parte.nota}>
                  <th scope="row" className="w-10 py-1 pr-2 text-left font-semibold">
                    {parte.nota} ★
                  </th>
                  <td className="py-1">
                    <svg
                      aria-hidden="true"
                      className="block h-2.5 w-full"
                      preserveAspectRatio="none"
                    >
                      <rect width="100%" height="100%" rx={5} className="fill-elevado" />
                      <rect
                        width={`${parte.porcentagem}%`}
                        height="100%"
                        rx={5}
                        className="fill-ouro"
                      />
                    </svg>
                  </td>
                  <td className="text-apagado w-16 py-1 pl-2 text-right tabular-nums">
                    {parte.quantidade} · {parte.porcentagem}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>

        <Cartao className="flex flex-col gap-3">
          <span className="text-suave text-sm font-semibold">Média por mês</span>
          <svg
            viewBox={`0 0 ${p.mensal.length * 10} 50`}
            className="h-24 w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {p.mensal.map((m, i) => {
              const altura = m.media === null ? 0 : (m.media / 5) * 46;
              return (
                <rect
                  key={m.competencia}
                  x={i * 10 + 2}
                  y={50 - altura}
                  width={6}
                  height={altura}
                  rx={1.5}
                  className={m.quantidade === maiorMes ? "fill-roxo" : "fill-roxo/50"}
                />
              );
            })}
          </svg>
          <details className="text-sm">
            <summary className="text-roxo-claro hover:text-texto font-semibold">
              Ver em tabela
            </summary>
            <table className="mt-2 w-full text-sm" aria-label="Média por mês">
              <thead>
                <tr className="text-apagado text-left">
                  <th className="font-normal">Mês</th>
                  <th className="text-right font-normal">Média</th>
                  <th className="text-right font-normal">Respostas</th>
                </tr>
              </thead>
              <tbody>
                {p.mensal.map((m) => (
                  <tr key={m.competencia}>
                    <td className="first-letter:uppercase">{nomeDoMes(m.competencia)}</td>
                    <td className="text-right tabular-nums">{formatarMedia(m.media)}</td>
                    <td className="text-right tabular-nums">{m.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Cartao>
      </section>

      <section aria-labelledby="titulo-respostas" className="flex flex-col gap-3">
        <h2 id="titulo-respostas" className="px-1 text-lg font-bold">
          Respostas
        </h2>
        {p.respostas.length === 0 ? (
          <Vazio titulo="Nenhuma resposta neste período">
            Mande o link do formulário para os alunos.
          </Vazio>
        ) : (
          <ul aria-label="Respostas" className="flex flex-col gap-3">
            {p.respostas.map((r) => (
              <li
                key={r.id}
                className={`${classeCartao} flex flex-col gap-3 ${r.lida ? "" : "border-roxo/50"}`}
                data-testid="resposta-feedback"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Estrelas nota={r.nota} />
                    <span className="text-sm font-semibold">{ROTULOS_DAS_NOTAS[r.nota]}</span>
                    {!r.lida && <Selo tom="roxo">Nova</Selo>}
                  </div>
                  <span className="text-apagado text-xs">{formatarDataHora(r.criadaEm)}</span>
                </div>
                {r.comentario && (
                  <div>
                    <p className="text-apagado text-xs font-semibold">O que está achando</p>
                    <p className="break-words whitespace-pre-line">{r.comentario}</p>
                  </div>
                )}
                {r.melhoria && (
                  <div>
                    <p className="text-apagado text-xs font-semibold">O que pode melhorar</p>
                    <p className="break-words whitespace-pre-line">{r.melhoria}</p>
                  </div>
                )}
                <p className="text-suave text-sm">
                  {r.nome ?? "Anônimo"}
                  {r.turma && ` · ${r.turma}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!r.lida && (
                    <BotaoAcao
                      acao={marcarFeedbackLido}
                      campos={{ respostaId: r.id }}
                      rotulo="Marcar como lida"
                      className={`${classeBotaoSecundario} ${classeBotaoPequeno}`}
                    />
                  )}
                  <BotaoAcao
                    acao={removerFeedback}
                    campos={{ respostaId: r.id }}
                    rotulo="Remover"
                    confirmar="Remover esta resposta? Ela sai do painel e das médias, e não volta."
                    className={`${classeBotaoPerigo} ${classeBotaoPequeno}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
