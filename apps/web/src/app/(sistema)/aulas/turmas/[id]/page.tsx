import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { encerrarMatricula, encerrarTurma, matricular } from "@/app/acoes/aulas";
import { BotaoAcao } from "@/components/botao-acao";
import {
  AcessoNegado,
  Aviso,
  classeBotao,
  classeBotaoSecundario,
  classeCampo,
} from "@/components/ui";
import { descreverHorarios, formatarData, formatarTelefone, NIVEIS } from "@/lib/aulas/formatacao";
import type { PaginaAlunos, TurmaDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Turma | Só Dois Toques" };

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

  const busca = typeof buscaAluno === "string" ? buscaAluno.trim().slice(0, 120) : "";
  const matriculados = new Set(turma.matriculas.map((m) => m.aluno.id));
  const candidatos =
    admin && turma.ativa && busca
      ? await chamarApi<PaginaAlunos>(`/alunos?situacao=ativos&busca=${encodeURIComponent(busca)}`)
      : null;

  return (
    <>
      {salva && <Aviso tipo="sucesso">Turma salva.</Aviso>}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{turma.nome}</h1>
        <p className="opacity-80">
          {NIVEIS[turma.nivel]} · {turma.local.nome} · Professor: {turma.professor.nome}
        </p>
        <p>{descreverHorarios(turma.horarios)}</p>
        <p data-testid="vagas">
          {turma.ocupadas} de {turma.vagas} vagas ocupadas · {turma.livres} livres
        </p>
        {!turma.ativa && <p className="font-medium">Turma encerrada</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        {turma.ativa && (
          <Link href={`/aulas/turmas/${turma.id}/presenca`} className={classeBotao}>
            Lista de presença
          </Link>
        )}
        {admin && turma.ativa && (
          <>
            <Link href={`/aulas/turmas/${turma.id}/editar`} className={classeBotaoSecundario}>
              Editar turma
            </Link>
            <BotaoAcao
              acao={encerrarTurma}
              campos={{ id: turma.id }}
              rotulo="Encerrar turma"
              confirmar="Encerrar a turma? As matrículas abertas também serão encerradas."
            />
          </>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Alunos matriculados</h2>
        {turma.matriculas.length === 0 ? (
          <p className="opacity-80">Nenhum aluno matriculado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-current/10" aria-label="Alunos matriculados">
            {turma.matriculas.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/aulas/alunos/${m.aluno.id}`} className="font-medium underline">
                    {m.aluno.nome}
                  </Link>
                  <span className="block text-sm opacity-80">
                    {formatarTelefone(m.aluno.telefone)} · desde {formatarData(m.inicio)}
                  </span>
                </span>
                {admin && (
                  <BotaoAcao
                    acao={encerrarMatricula}
                    campos={{ id: m.id }}
                    rotulo="Tirar da turma"
                    confirmar={`Encerrar a matrícula de ${m.aluno.nome}?`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin && turma.ativa && (
        <section className="flex flex-col gap-3 rounded-lg border border-current/15 p-4">
          <h2 className="text-lg font-medium">Matricular aluno</h2>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Buscar aluno por nome ou telefone
              <input
                name="buscaAluno"
                defaultValue={busca}
                className={classeCampo}
                maxLength={120}
              />
            </label>
            <button type="submit" className={classeBotaoSecundario}>
              Buscar
            </button>
          </form>
          {candidatos && !candidatos.ok && <Aviso tipo="erro">{candidatos.mensagem}</Aviso>}
          {candidatos?.ok && (
            <ul
              className="flex flex-col divide-y divide-current/10"
              aria-label="Alunos encontrados"
            >
              {candidatos.dados.itens.length === 0 && (
                <li className="py-2 opacity-80">Nenhum aluno ativo encontrado.</li>
              )}
              {candidatos.dados.itens.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {a.nome}{" "}
                    <span className="text-sm opacity-80">{formatarTelefone(a.telefone)}</span>
                  </span>
                  {matriculados.has(a.id) ? (
                    <span className="text-sm opacity-80">Já está na turma</span>
                  ) : (
                    <BotaoAcao
                      acao={matricular}
                      campos={{ turmaId: turma.id, alunoId: a.id }}
                      rotulo="Matricular"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
