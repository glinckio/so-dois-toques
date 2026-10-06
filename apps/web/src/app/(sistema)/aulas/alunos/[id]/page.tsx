import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { inativarAluno, reativarAluno } from "@/app/acoes/aulas";
import { FormAnonimizar } from "@/components/aulas/form-anonimizar";
import { BotaoAcao } from "@/components/botao-acao";
import { AcessoNegado, Aviso, classeBotaoSecundario } from "@/components/ui";
import { formatarData, formatarTelefone } from "@/lib/aulas/formatacao";
import type { AlunoDetalhe } from "@/lib/aulas/tipos";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Aluno | Só Dois Toques" };

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="text-sm opacity-70 sm:w-48">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

export default async function PaginaAluno({
  params,
  searchParams,
}: PageProps<"/aulas/alunos/[id]">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { id } = await params;
  const { salvo } = await searchParams;
  const resposta = await chamarApi<AlunoDetalhe>(`/alunos/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const aluno = resposta.dados;
  const admin = usuario.perfil === "ADMINISTRADOR";

  return (
    <>
      {salvo && <Aviso tipo="sucesso">Aluno salvo.</Aviso>}
      <header>
        <h1 className="text-2xl font-semibold">{aluno.nome}</h1>
        <p className="opacity-80">
          {aluno.anonimizado ? "Anonimizado" : aluno.ativo ? "Ativo" : "Inativo"}
        </p>
      </header>
      {!aluno.anonimizado && (
        <dl className="flex flex-col gap-2">
          <Linha rotulo="Telefone" valor={formatarTelefone(aluno.telefone)} />
          <Linha rotulo="Nascimento" valor={formatarData(aluno.nascimento)} />
          <Linha rotulo="E-mail" valor={aluno.email} />
          <Linha
            rotulo="Contato de emergência"
            valor={
              aluno.emergenciaNome &&
              `${aluno.emergenciaNome}, ${formatarTelefone(aluno.emergenciaTelefone)}`
            }
          />
          <Linha
            rotulo="Responsável"
            valor={
              aluno.responsavelNome &&
              `${aluno.responsavelNome}, ${formatarTelefone(aluno.responsavelTelefone)}`
            }
          />
          <Linha rotulo="Observações" valor={aluno.observacoes} />
          {aluno.consentimentoEm && (
            <Linha
              rotulo="Consentimento"
              valor={`Dado pelo ${aluno.consentimentoPor === "RESPONSAVEL" ? "responsável" : "aluno"} em ${formatarDataHora(aluno.consentimentoEm)}, registrado por ${aluno.consentimentoRegistradoPor}`}
            />
          )}
        </dl>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Turmas</h2>
        {aluno.matriculas.length === 0 ? (
          <p className="opacity-80">Sem matrículas.</p>
        ) : (
          <ul className="flex flex-col gap-1" aria-label="Matrículas">
            {aluno.matriculas.map((m) => (
              <li key={m.id}>
                <Link href={`/aulas/turmas/${m.turma.id}`} className="underline">
                  {m.turma.nome}
                </Link>{" "}
                <span className="text-sm opacity-80">
                  desde {formatarData(m.inicio)}
                  {m.fim ? `, saiu em ${formatarData(m.fim)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin && !aluno.anonimizado && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Link href={`/aulas/alunos/${aluno.id}/editar`} className={classeBotaoSecundario}>
              Editar
            </Link>
            {aluno.ativo ? (
              <BotaoAcao
                acao={inativarAluno}
                campos={{ id: aluno.id }}
                rotulo="Inativar"
                confirmar="Inativar o aluno? As matrículas abertas serão encerradas."
              />
            ) : (
              <BotaoAcao acao={reativarAluno} campos={{ id: aluno.id }} rotulo="Reativar" />
            )}
            <a
              href={`/aulas/alunos/${aluno.id}/exportar`}
              className={classeBotaoSecundario}
              download
            >
              Exportar dados (LGPD)
            </a>
          </div>
          <FormAnonimizar id={aluno.id} />
        </section>
      )}
    </>
  );
}
