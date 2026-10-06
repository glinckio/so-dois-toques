import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ListaPresenca } from "@/components/aulas/lista-presenca";
import { AcessoNegado, Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import {
  DIAS_SEMANA,
  diaDaSemana,
  formatarData,
  hojeEmSaoPaulo,
  ultimaAula,
} from "@/lib/aulas/formatacao";
import type { ListaPresenca as Lista, TurmaDetalhe } from "@/lib/aulas/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Presença | Só Dois Toques" };

export default async function PaginaPresenca({
  params,
  searchParams,
}: PageProps<"/aulas/turmas/[id]/presenca">) {
  await connection();
  const { permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { id } = await params;
  const turma = await chamarApi<TurmaDetalhe>(`/turmas/${encodeURIComponent(id)}`);
  if (!turma.ok) return <Aviso tipo="erro">{turma.mensagem}</Aviso>;

  const hoje = hojeEmSaoPaulo();
  const { data: pedida } = await searchParams;
  const data =
    typeof pedida === "string" && /^\d{4}-\d{2}-\d{2}$/.test(pedida)
      ? pedida
      : (ultimaAula(turma.dados.horarios, hoje) ?? hoje);
  const lista = await chamarApi<Lista>(`/turmas/${turma.dados.id}/presencas/${data}`);

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link href={`/aulas/turmas/${turma.dados.id}`} className="text-sm underline">
          Voltar para a turma
        </Link>
        <h1 className="text-2xl font-semibold">Presença: {turma.dados.nome}</h1>
        <p className="opacity-80">
          {DIAS_SEMANA[diaDaSemana(data)]}, {formatarData(data)}
        </p>
      </header>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Data da aula
          <input
            type="date"
            name="data"
            defaultValue={data}
            max={hoje}
            className={`${classeCampo} w-auto`}
          />
        </label>
        <button type="submit" className={classeBotaoSecundario}>
          Abrir
        </button>
      </form>
      {!lista.ok ? (
        <Aviso tipo="erro">{lista.mensagem}</Aviso>
      ) : lista.dados.alunos.length === 0 ? (
        <p className="opacity-80">Nenhum aluno matriculado nessa data.</p>
      ) : (
        <ListaPresenca key={data} lista={lista.dados} />
      )}
    </>
  );
}
