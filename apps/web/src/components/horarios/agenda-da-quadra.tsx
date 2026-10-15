import Link from "next/link";
import { PontoVivo } from "@/components/base/selo";
import { Icone } from "@/components/icones";
import { NIVEIS } from "@/lib/aulas/formatacao";
import {
  descreverBloco,
  LINHAS_DA_AGENDA,
  type Agenda,
  type BlocoDaAgenda,
  type LivreDaAgenda,
} from "@/lib/horarios/agenda";
import { faixaDeMinutos, rotuloHora } from "@/lib/horarios/formatacao";
import { FILETE_DA_SITUACAO, FUNDO_DA_SITUACAO } from "./estilos";

/**
 * FOCO-CA-05: a agenda do dia da quadra. Cada quarto de hora é uma linha da grade (CSS
 * grid com `row-start`/`row-span`, sem estilo embutido); as horas ficam à esquerda, a
 * aula ou o bloqueio é um bloco que ocupa todo o seu tempo e cada hora inteira livre é
 * uma célula tracejada (que leva ao bloqueio, para o administrador). Para o leitor de
 * tela, é uma lista na ordem do dia.
 */
export function AgendaDaQuadra({
  agenda,
  data,
  admin,
  linkDaTurma,
}: {
  agenda: Agenda;
  data: string;
  admin: boolean;
  /** Quem acessa Aulas abre a turma pelo bloco; os outros só veem. */
  linkDaTurma: boolean;
}) {
  return (
    <div
      role="list"
      aria-label={`Agenda da quadra em ${data}`}
      className="relative grid auto-rows-[0.95rem] grid-cols-[3.25rem_minmax(0,1fr)] bg-[repeating-linear-gradient(to_bottom,rgb(44_35_84_/_0.75)_0_1px,transparent_1px_3.8rem)]"
    >
      {agenda.horas.map((h) => (
        <span
          key={h.hora}
          aria-hidden="true"
          className={`row-start-${h.linha} col-start-1 row-span-4 pt-1 pr-2 text-right text-xs font-bold tabular-nums ${
            h.agora ? "text-ouro" : h.passou ? "text-apagado/55" : "text-apagado"
          }`}
        >
          {rotuloHora(h.hora)}
        </span>
      ))}
      {[...agenda.blocos, ...agenda.livres]
        .sort((a, b) => a.linha - b.linha)
        .map((item) =>
          item.tipo === "livre" ? (
            <CelulaLivre key={`livre-${item.hora}`} livre={item} data={data} admin={admin} />
          ) : (
            <Bloco
              key={
                item.tipo === "aula" ? `aula-${item.aula.turmaId}-${item.inicio}` : item.bloqueio.id
              }
              bloco={item}
              linkDaTurma={linkDaTurma}
            />
          ),
        )}
      {agenda.agora && (
        <div
          aria-hidden="true"
          className={`row-start-${agenda.agora.linha} pointer-events-none relative z-10 col-start-2`}
        >
          <span className="bg-ouro absolute inset-x-1 top-0 h-0.5 rounded-full shadow-[0_0_10px_rgb(233_171_2_/_0.9)]" />
          <span className="animate-pulsar bg-ouro text-ouro absolute top-0 -left-1 size-2.5 -translate-y-1/2 rounded-full" />
        </div>
      )}
      <span aria-hidden="true" className={`row-start-${LINHAS_DA_AGENDA} col-start-1`} />
    </div>
  );
}

/** Hora inteira livre: célula tracejada; o administrador toca para bloquear. */
function CelulaLivre({
  livre,
  data,
  admin,
}: {
  livre: LivreDaAgenda;
  data: string;
  admin: boolean;
}) {
  const classe = `row-start-${livre.linha} row-span-4 col-start-2 p-1`;
  if (livre.passou || !admin) {
    return (
      <div role="listitem" className={classe}>
        <span
          className={`flex h-full items-center justify-center rounded-2xl border border-dashed text-xs ${
            livre.passou ? "border-borda/45 text-apagado/50" : "border-borda text-apagado"
          }`}
        >
          Livre<span className="sr-only">, {rotuloHora(livre.hora)}</span>
        </span>
      </div>
    );
  }
  return (
    <div role="listitem" className={classe}>
      <Link
        href={`/horarios/bloquear?data=${data}&hora=${livre.hora}`}
        aria-label={`Bloquear às ${rotuloHora(livre.hora)}`}
        className="group border-borda text-apagado hover:border-roxo/60 hover:bg-roxo/10 hover:text-roxo-claro flex h-full items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm font-semibold transition duration-200 active:scale-[0.97]"
      >
        <Icone
          nome="bloqueio"
          width={15}
          height={15}
          className="ease-mola transition-transform duration-300 group-hover:rotate-12"
        />
        Livre · bloquear
      </Link>
    </div>
  );
}

/** A aula ou o bloqueio num bloco só, colorido pela situação e sempre com o texto. */
function Bloco({ bloco, linkDaTurma }: { bloco: BlocoDaAgenda; linkDaTurma: boolean }) {
  const horario = faixaDeMinutos(bloco.inicio, bloco.fim);
  const alto = bloco.linhas >= 4;
  const rotulo = `${descreverBloco(bloco)}${bloco.momento === "agora" ? ", em andamento" : ""}`;
  const href =
    bloco.tipo === "bloqueio"
      ? `/horarios/bloqueios/${bloco.bloqueio.id}`
      : linkDaTurma
        ? `/aulas/turmas/${bloco.aula.turmaId}`
        : null;
  const conteudo = (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-1.5 left-1.5 w-1 rounded-full ${FILETE_DA_SITUACAO[bloco.situacao]}`}
      />
      <span className="flex min-w-0 items-center gap-1.5">
        <Icone
          nome={bloco.tipo === "bloqueio" ? "bloqueio" : "aulas"}
          width={14}
          height={14}
          className="text-suave shrink-0"
        />
        <span className="min-w-0 truncate text-sm leading-5 font-semibold">
          {bloco.tipo === "bloqueio" ? `Bloqueado: ${bloco.bloqueio.motivo}` : bloco.aula.nome}
        </span>
        {bloco.momento === "agora" && (
          <span className="ml-auto shrink-0">
            <PontoVivo tom="ouro" />
          </span>
        )}
      </span>
      {alto && (
        <span className="text-suave truncate text-xs tabular-nums">
          {horario}
          {bloco.tipo === "aula" &&
            ` · ${bloco.aula.professor.nome} · ${NIVEIS[bloco.aula.nivel]} · ${bloco.aula.ocupadas}/${bloco.aula.vagas} alunos`}
        </span>
      )}
    </>
  );
  const classe = `@container relative flex h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-2xl border py-1 pr-2 pl-4 ${FUNDO_DA_SITUACAO[bloco.situacao]} ${
    bloco.momento === "agora"
      ? "ring-ouro/70 ring-2"
      : bloco.momento === "passou"
        ? "opacity-55 saturate-50"
        : ""
  }`;
  return (
    <div
      role="listitem"
      data-linhas={bloco.linhas}
      className={`row-start-${bloco.linha} row-span-${bloco.linhas} animate-surgir relative col-start-2 min-h-0 p-0.5 atraso-${Math.min(24, Math.floor(bloco.linha / 4) + 2)}`}
    >
      {href ? (
        <Link
          href={href}
          aria-label={rotulo}
          className={`${classe} transition duration-200 hover:-translate-y-px hover:brightness-110`}
        >
          {conteudo}
        </Link>
      ) : (
        <span aria-label={rotulo} role="group" className={classe}>
          {conteudo}
        </span>
      )}
    </div>
  );
}
