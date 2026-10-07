import type { Metadata } from "next";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import { PilulasDeHorario } from "@/components/aulas/horarios";
import { ListaPresenca } from "@/components/aulas/lista-presenca";
import { SemanaDaPresenca } from "@/components/aulas/semana-da-presenca";
import { SeloNivel } from "@/components/aulas/selo-nivel";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Vazio } from "@/components/base/vazio";
import { Icone } from "@/components/icones";
import {
  AcessoNegado,
  Aviso,
  classeBotaoSecundario,
  classeCampo,
  classeRotulo,
} from "@/components/ui";
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

/** AULAS-CA-17 e VIVO-CA-09: a chamada da aula, com a faixa dos dias de aula da turma. */
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
  const caminho = `/aulas/turmas/${turma.dados.id}/presenca`;

  return (
    <>
      <LinkVoltar href={`/aulas/turmas/${turma.dados.id}`}>Voltar para a turma</LinkVoltar>
      <Cabecalho
        etiqueta={`${DIAS_SEMANA[diaDaSemana(data)]}, ${formatarData(data)}`}
        icone="calendario"
        titulo={
          <>
            <Destaque>Presença</Destaque>: {turma.dados.nome}
          </>
        }
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <SeloNivel nivel={turma.dados.nivel} />
            <span className="inline-flex items-center gap-1.5">
              <Icone nome="local" width={15} height={15} className="text-areia" />
              {turma.dados.local.nome}
            </span>
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        <SemanaDaPresenca
          caminho={caminho}
          data={data}
          hoje={hoje}
          horarios={turma.dados.horarios}
          inicioDaTurma={turma.dados.inicio}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <PilulasDeHorario horarios={turma.dados.horarios} destaqueDia={diaDaSemana(data)} />
          <details className="group">
            <summary className="text-roxo-claro hover:text-texto inline-flex min-h-10 items-center gap-2 rounded-full text-sm font-semibold">
              <Icone
                nome="abaixo"
                width={16}
                height={16}
                className="transition-transform group-open:rotate-180"
              />
              Outra data
            </summary>
            <form method="get" className="animate-entrar mt-3 flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="data" className={classeRotulo}>
                  Data da aula
                </label>
                <input
                  id="data"
                  type="date"
                  name="data"
                  defaultValue={data}
                  max={hoje}
                  className={`${classeCampo} w-auto`}
                />
              </div>
              <button type="submit" className={classeBotaoSecundario}>
                Abrir
              </button>
            </form>
          </details>
        </div>
      </div>
      {!lista.ok ? (
        <Aviso tipo="erro">{lista.mensagem}</Aviso>
      ) : lista.dados.alunos.length === 0 ? (
        <Vazio titulo="Nenhum aluno matriculado nessa data.">
          Quem estiver matriculado no dia da aula aparece aqui para marcar presença.
        </Vazio>
      ) : (
        <ListaPresenca key={data} lista={lista.dados} />
      )}
    </>
  );
}
