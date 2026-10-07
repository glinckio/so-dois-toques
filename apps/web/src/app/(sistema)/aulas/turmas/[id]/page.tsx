import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { encerrarMatricula, encerrarTurma, matricular } from "@/app/acoes/aulas";
import { PilulasDeHorario, SemanaDaTurma } from "@/components/aulas/horarios";
import { SeloNivel } from "@/components/aulas/selo-nivel";
import { Anel } from "@/components/base/anel";
import { Avatar } from "@/components/base/avatar";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { Icone } from "@/components/icones";
import {
  AcessoNegado,
  Aviso,
  Campo,
  classeBotao,
  classeBotaoFantasma,
  classeBotaoPerigo,
  classeBotaoSecundario,
  SetaDoBotao,
} from "@/components/ui";
import {
  diaDaSemana,
  formatarData,
  formatarTelefone,
  hojeEmSaoPaulo,
} from "@/lib/aulas/formatacao";
import type { PaginaAlunos, TurmaDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Turma | Só Dois Toques" };

/**
 * A turma: cabeçalho com o anel grande de vagas, a semana e os horários; os alunos
 * com avatar e, para o administrador, a matrícula pela busca.
 */
export default async function PaginaTurma({
  params,
  searchParams,
}: PageProps<"/aulas/turmas/[id]">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { id } = await params;
  const { buscaAluno, salva } = await searchParams;
  const resposta = await chamarApi<TurmaDetalhe>(`/turmas/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const turma = resposta.dados;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const diaDeHoje = diaDaSemana(hojeEmSaoPaulo());
  const temAulaHoje = turma.ativa && turma.horarios.some((h) => h.diaSemana === diaDeHoje);
  const fracao = turma.vagas > 0 ? turma.ocupadas / turma.vagas : 0;
  const cheia = turma.vagas > 0 && turma.ocupadas >= turma.vagas;

  const busca = typeof buscaAluno === "string" ? buscaAluno.trim().slice(0, 120) : "";
  const matriculados = new Set(turma.matriculas.map((m) => m.aluno.id));
  const candidatos =
    admin && turma.ativa && busca
      ? await chamarApi<PaginaAlunos>(`/alunos?situacao=ativos&busca=${encodeURIComponent(busca)}`)
      : null;

  return (
    <>
      {salva && <Aviso tipo="sucesso">Turma salva.</Aviso>}
      <LinkVoltar href="/aulas">Voltar para as turmas</LinkVoltar>

      <header className="superficie-destaque relative grid gap-6 overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <span
          aria-hidden="true"
          className="bg-roxo/25 pointer-events-none absolute -top-28 -right-20 size-80 rounded-full blur-3xl"
        />
        <span
          aria-hidden="true"
          className="bg-ouro/10 pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full blur-3xl"
        />
        <div className="relative flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeloNivel nivel={turma.nivel} />
            {!turma.ativa && <Selo tom="neutro">Turma encerrada</Selo>}
            {temAulaHoje && (
              <Selo tom="ouro" pulsar>
                Tem aula hoje
              </Selo>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[2.6rem]">
              {turma.nome}
            </h1>
            <p className="text-suave flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Icone nome="local" width={16} height={16} className="text-areia" />
                {turma.local.nome}
              </span>
              <span className="inline-flex items-center gap-2">
                <Avatar nome={turma.professor.nome} tamanho="p" />
                Professor: <strong className="text-texto">{turma.professor.nome}</strong>
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <SemanaDaTurma horarios={turma.horarios} hoje={diaDeHoje} />
            <PilulasDeHorario
              horarios={turma.horarios}
              destaqueDia={temAulaHoje ? diaDeHoje : undefined}
            />
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {turma.ativa && (
              <Link href={`/aulas/turmas/${turma.id}/presenca`} className={classeBotao}>
                <Icone nome="check" width={18} height={18} strokeWidth={2.4} />
                Lista de presença
                <SetaDoBotao />
              </Link>
            )}
            {admin && turma.ativa && (
              <>
                <Link href={`/aulas/turmas/${turma.id}/editar`} className={classeBotaoSecundario}>
                  <Icone nome="editar" width={17} height={17} />
                  Editar turma
                </Link>
                <BotaoAcao
                  acao={encerrarTurma}
                  campos={{ id: turma.id }}
                  rotulo="Encerrar turma"
                  confirmar="Encerrar a turma? As matrículas abertas também serão encerradas."
                  className={classeBotaoPerigo}
                />
              </>
            )}
          </div>
        </div>

        <div className="vidro relative flex items-center gap-5 rounded-[1.75rem] p-5 lg:flex-col lg:gap-3 lg:px-8">
          <Anel
            fracao={fracao}
            tamanho={136}
            espessura={9}
            tom={cheia ? "sucesso" : "roxo"}
            rotulo={`${turma.ocupadas} de ${turma.vagas} vagas ocupadas`}
          >
            <span className="flex flex-col">
              <span className="text-4xl leading-none font-extrabold tabular-nums">
                {turma.ocupadas}
                <span className="text-apagado text-xl font-bold">/{turma.vagas}</span>
              </span>
              <span className="text-apagado mt-1 text-[0.65rem] font-bold tracking-[0.14em] uppercase">
                vagas
              </span>
            </span>
          </Anel>
          <div className="flex flex-col gap-1 lg:items-center lg:text-center">
            <p className="text-sm font-semibold" data-testid="vagas">
              {turma.ocupadas} de {turma.vagas} vagas ocupadas · {turma.livres} livres
            </p>
            <p className="text-apagado text-xs">
              {cheia ? "Turma cheia." : `Cabem mais ${turma.livres} na turma.`}
            </p>
          </div>
        </div>
      </header>

      <div
        className={`grid items-start gap-4 ${admin && turma.ativa ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]" : ""}`}
      >
        <Cartao aria-labelledby="titulo-matriculados" className="flex flex-col gap-4">
          <CabecalhoCartao
            id="titulo-matriculados"
            icone="usuarios"
            titulo="Alunos matriculados"
            descricao={
              turma.matriculas.length === 0
                ? "Ninguém na turma ainda"
                : `${turma.matriculas.length} ${turma.matriculas.length === 1 ? "aluno" : "alunos"} na turma`
            }
          />
          {turma.matriculas.length === 0 ? (
            <Vazio compacto titulo="Nenhum aluno matriculado.">
              {admin && turma.ativa ? "Busque o aluno ao lado para matricular." : undefined}
            </Vazio>
          ) : (
            <ul className="flex flex-col gap-1" aria-label="Alunos matriculados">
              {turma.matriculas.map((m, i) => (
                <li
                  key={m.id}
                  className={`animate-entrar hover:bg-elevado/50 flex flex-wrap items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors sm:flex-nowrap atraso-${Math.min(24, i + 2)}`}
                >
                  <Avatar nome={m.aluno.nome} tamanho="m" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/aulas/alunos/${m.aluno.id}`}
                      className="hover:text-roxo-claro truncate font-semibold transition-colors"
                    >
                      {m.aluno.nome}
                    </Link>
                    <span className="text-apagado flex flex-wrap items-center gap-x-2 text-sm">
                      {m.aluno.telefone && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Icone nome="telefone" width={13} height={13} />
                          {formatarTelefone(m.aluno.telefone)}
                        </span>
                      )}
                      <span>desde {formatarData(m.inicio)}</span>
                    </span>
                  </span>
                  {admin && (
                    <BotaoAcao
                      acao={encerrarMatricula}
                      campos={{ id: m.id }}
                      rotulo="Tirar da turma"
                      confirmar={`Encerrar a matrícula de ${m.aluno.nome}?`}
                      className={classeBotaoFantasma}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {admin && turma.ativa && (
          <Cartao aria-labelledby="titulo-matricular" className="flex flex-col gap-4">
            <CabecalhoCartao
              id="titulo-matricular"
              icone="mais"
              tom="ouro"
              titulo="Matricular aluno"
              descricao={
                cheia
                  ? "A turma está cheia: aumente as vagas para matricular."
                  : `${turma.livres} ${turma.livres === 1 ? "vaga livre" : "vagas livres"}`
              }
            />
            <form method="get" className="flex flex-col gap-2">
              <Campo
                rotulo="Buscar aluno por nome ou telefone"
                id="buscaAluno"
                icone="busca"
                type="search"
                defaultValue={busca}
                maxLength={120}
                autoComplete="off"
              />
              <button type="submit" className={`${classeBotaoSecundario} self-start`}>
                Buscar
              </button>
            </form>
            {candidatos && !candidatos.ok && <Aviso tipo="erro">{candidatos.mensagem}</Aviso>}
            {candidatos?.ok && (
              <ul className="flex flex-col gap-1" aria-label="Alunos encontrados">
                {candidatos.dados.itens.length === 0 && (
                  <li className="text-suave px-2 py-2 text-sm">Nenhum aluno ativo encontrado.</li>
                )}
                {candidatos.dados.itens.map((a) => (
                  <li
                    key={a.id}
                    className="bg-elevado/35 flex flex-wrap items-center gap-3 rounded-2xl p-2.5"
                  >
                    <Avatar nome={a.nome} tamanho="p" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{a.nome}</span>
                      <span className="text-apagado text-xs tabular-nums">
                        {formatarTelefone(a.telefone)}
                      </span>
                    </span>
                    {matriculados.has(a.id) ? (
                      <Selo tom="sucesso">Já está na turma</Selo>
                    ) : (
                      <BotaoAcao
                        acao={matricular}
                        campos={{ turmaId: turma.id, alunoId: a.id }}
                        rotulo="Matricular"
                        className={classeBotao}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        )}
      </div>
    </>
  );
}
