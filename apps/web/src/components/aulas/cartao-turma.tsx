import Link from "next/link";
import { Anel } from "@/components/base/anel";
import { Avatar } from "@/components/base/avatar";
import { Selo } from "@/components/base/selo";
import { Icone } from "@/components/icones";
import { horaDe } from "@/lib/aulas/formatacao";
import type { TurmaResumo } from "@/lib/aulas/tipos";
import { aulaDoDia } from "@/lib/aulas/visual";
import { PilulasDeHorario } from "./horarios";
import { SeloNivel } from "./selo-nivel";

/**
 * Cartão da turma: o nível no selo com sinal de barras, o local e os horários em
 * pílulas, o professor com avatar e o anel de vagas ocupadas. Se a turma tem aula
 * hoje, a hora aparece num selo dourado (pulsando enquanto a aula acontece).
 */
export function CartaoTurma({
  turma,
  diaDeHoje,
  minutoAtual,
  indice,
}: {
  turma: TurmaResumo;
  diaDeHoje: number;
  minutoAtual: number;
  indice: number;
}) {
  const fracao = turma.vagas > 0 ? turma.ocupadas / turma.vagas : 0;
  const cheia = turma.vagas > 0 && turma.ocupadas >= turma.vagas;
  const hoje = turma.ativa ? aulaDoDia(turma.horarios, diaDeHoje) : null;
  const agora = hoje !== null && minutoAtual >= hoje.inicio && minutoAtual < hoje.fim;
  return (
    <li className={`animate-entrar atraso-${Math.min(24, indice * 2)}`}>
      <Link
        href={`/aulas/turmas/${turma.id}`}
        className={`group superficie ease-mola relative flex h-full flex-col gap-4 overflow-hidden rounded-[1.75rem] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#3a2f6b] ${
          turma.ativa ? "" : "opacity-70"
        }`}
      >
        <span
          aria-hidden="true"
          className="bg-roxo/15 pointer-events-none absolute -top-16 -right-12 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <div className="relative flex flex-wrap items-center gap-2">
          <SeloNivel nivel={turma.nivel} />
          {!turma.ativa && <Selo tom="neutro">Encerrada</Selo>}
          {hoje &&
            (agora ? (
              <Selo tom="ouro" pulsar>
                Em aula agora
              </Selo>
            ) : (
              <Selo tom="ouro">Hoje, {horaDe(hoje.inicio)}</Selo>
            ))}
          {cheia && turma.ativa && <Selo tom="sucesso">Turma cheia</Selo>}
        </div>

        <div className="relative flex min-w-0 flex-col gap-2">
          <h2 className="text-xl leading-tight font-extrabold tracking-tight">{turma.nome}</h2>
          <span className="text-suave inline-flex items-center gap-1.5 text-sm">
            <Icone nome="local" width={15} height={15} className="text-areia shrink-0" />
            <span className="truncate">{turma.local.nome}</span>
          </span>
        </div>

        <div className="relative">
          <PilulasDeHorario horarios={turma.horarios} destaqueDia={hoje ? diaDeHoje : undefined} />
        </div>

        <div className="border-borda relative mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar nome={turma.professor.nome} tamanho="m" />
            <span className="flex min-w-0 flex-col">
              <span className="text-apagado text-[0.68rem] font-bold tracking-[0.12em] uppercase">
                Professor
              </span>
              <span className="truncate text-sm font-semibold">{turma.professor.nome}</span>
            </span>
          </span>
          <span className="flex items-center gap-3">
            <span className="flex flex-col items-end text-right">
              <span className="text-sm font-bold">
                {turma.livres === 0
                  ? "Sem vagas livres"
                  : `${turma.livres} ${turma.livres === 1 ? "vaga livre" : "vagas livres"}`}
              </span>
              <span className="text-apagado text-xs tabular-nums">
                {turma.ocupadas} de {turma.vagas} ocupadas
              </span>
            </span>
            <Anel
              fracao={fracao}
              tamanho={52}
              espessura={10}
              tom={cheia ? "sucesso" : "roxo"}
              rotulo={`${turma.ocupadas} de ${turma.vagas} vagas ocupadas`}
            >
              <span className="text-[0.68rem] font-extrabold tabular-nums">
                {turma.ocupadas}/{turma.vagas}
              </span>
            </Anel>
          </span>
        </div>
      </Link>
    </li>
  );
}
