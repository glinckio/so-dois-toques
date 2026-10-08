import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CartaoTurma } from "@/components/aulas/cartao-turma";
import { Anel } from "@/components/base/anel";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { PilulasDeLinks } from "@/components/base/pilulas";
import { SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import { AcessoNegado, Aviso, classeBotao, SetaDoBotao } from "@/components/ui";
import { diaDaSemana, hojeEmSaoPaulo, horaDe } from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import { resumoDasTurmas, type ResumoDasTurmas } from "@/lib/aulas/visual";
import { minutoEmSaoPaulo } from "@/lib/painel/inicio";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Aulas | Só Dois Toques" };

/**
 * Turmas em cartões (nível, local, horários, professor e anel de vagas), com as
 * abas Ativas e Encerradas e, nas ativas, o destaque da ocupação e da próxima aula.
 */
export default async function PaginaTurmas({ searchParams }: PageProps<"/aulas">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { situacao } = await searchParams;
  const encerradas = situacao === "encerradas";
  const resposta = await chamarApi<TurmaResumo[]>(
    `/turmas?situacao=${encerradas ? "encerradas" : "ativas"}`,
  );
  const admin = usuario.perfil === "ADMINISTRADOR";
  const agora = new Date();
  const diaDeHoje = diaDaSemana(hojeEmSaoPaulo(agora));
  const minutoAtual = minutoEmSaoPaulo(agora);
  const turmas = resposta.ok ? resposta.dados : [];
  const resumo = resumoDasTurmas(turmas, diaDeHoje, minutoAtual);

  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="aulas"
        titulo={
          admin ? (
            <>
              Turmas e <Destaque>vagas</Destaque>
            </>
          ) : (
            <>
              Minhas <Destaque>turmas</Destaque>
            </>
          )
        }
        descricao={
          admin
            ? "Cada turma com o nível, o local, os horários e quantas vagas já estão ocupadas."
            : "As turmas em que você dá aula, com os horários e a lista de presença."
        }
        acoes={
          admin && (
            <Link href="/aulas/turmas/nova" className={classeBotao}>
              <Icone nome="mais" width={18} height={18} />
              Nova turma
              <SetaDoBotao />
            </Link>
          )
        }
      />

      <PilulasDeLinks
        rotulo="Situação das turmas"
        itens={[
          { href: "/aulas", rotulo: "Ativas", atual: !encerradas },
          { href: "/aulas?situacao=encerradas", rotulo: "Encerradas", atual: encerradas },
        ]}
      />

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : turmas.length === 0 ? (
        <Vazio
          titulo={`Nenhuma turma ${encerradas ? "encerrada" : "ativa"}.`}
          acao={
            admin &&
            !encerradas && (
              <Link href="/aulas/turmas/nova" className={classeBotao}>
                <Icone nome="mais" width={18} height={18} />
                Nova turma
              </Link>
            )
          }
        >
          {encerradas
            ? "As turmas encerradas ficam aqui, com o histórico de presença."
            : admin
              ? "Crie a primeira turma com o local, o professor e os horários."
              : "Quando o administrador colocar você numa turma, ela aparece aqui."}
        </Vazio>
      ) : (
        <>
          {!encerradas && <Ocupacao resumo={resumo} />}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Turmas">
            {turmas.map((t, i) => (
              <CartaoTurma
                key={t.id}
                turma={t}
                diaDeHoje={diaDeHoje}
                minutoAtual={minutoAtual}
                indice={i}
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Destaque da tela: a ocupação de todas as turmas num anel e a aula de agora ou a próxima. */
function Ocupacao({ resumo }: { resumo: ResumoDasTurmas }) {
  const numeros = [
    { rotulo: resumo.turmas === 1 ? "turma ativa" : "turmas ativas", valor: resumo.turmas },
    { rotulo: resumo.livres === 1 ? "vaga livre" : "vagas livres", valor: resumo.livres },
    { rotulo: resumo.lotadas === 1 ? "turma cheia" : "turmas cheias", valor: resumo.lotadas },
  ];
  return (
    <section
      aria-label="Ocupação das turmas"
      className="superficie-destaque relative grid grid-cols-1 gap-5 overflow-hidden rounded-[2rem] p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,20rem)] lg:items-center"
    >
      <span
        aria-hidden="true"
        className="bg-roxo/25 pointer-events-none absolute -top-24 -left-16 size-64 rounded-full blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <Anel
          fracao={resumo.fracao}
          tamanho={104}
          espessura={10}
          tom={resumo.fracao >= 1 ? "sucesso" : "roxo"}
          rotulo={`${resumo.ocupadas} de ${resumo.vagas} vagas ocupadas nas turmas ativas`}
        >
          <span className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums">
              {Math.round(resumo.fracao * 100)}%
            </span>
            <span className="text-apagado text-[0.62rem] font-bold tracking-[0.14em] uppercase">
              ocupação
            </span>
          </span>
        </Anel>
        <p className="flex flex-col">
          <span className="text-3xl leading-none font-extrabold tabular-nums">
            {resumo.ocupadas}
            <span className="text-apagado text-lg font-bold">/{resumo.vagas}</span>
          </span>
          <span className="text-suave text-sm">vagas ocupadas</span>
        </p>
      </div>
      <dl className="relative grid grid-cols-3 gap-2 sm:gap-3">
        {numeros.map((n) => (
          <div key={n.rotulo} className="vidro flex flex-col gap-1 rounded-2xl p-3">
            <dt className="text-suave order-2 text-xs">{n.rotulo}</dt>
            <dd className="text-2xl leading-none font-extrabold tabular-nums">{n.valor}</dd>
          </div>
        ))}
      </dl>
      <div className="relative flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <SeloIcone nome="relogio" tom="ouro" />
        {resumo.proxima ? (
          <p className="flex min-w-0 flex-1 flex-col">
            <span className="text-ouro text-xs font-bold tracking-[0.12em] uppercase">
              {resumo.proxima.agora ? "Em aula agora" : "Próxima aula hoje"}
            </span>
            <span className="truncate font-semibold">{resumo.proxima.nome}</span>
            <span className="text-apagado text-xs tabular-nums">
              {horaDe(resumo.proxima.inicio)} às {horaDe(resumo.proxima.fim)}
            </span>
          </p>
        ) : (
          <p className="flex flex-col">
            <span className="text-apagado text-xs font-bold tracking-[0.12em] uppercase">Hoje</span>
            <span className="text-suave text-sm">
              {resumo.aulasHoje === 0 ? "Nenhuma aula hoje." : "As aulas de hoje já terminaram."}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
