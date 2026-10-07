import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FaixaDeDias } from "@/components/base/faixa-de-dias";
import { Vazio } from "@/components/base/vazio";
import { AgendaDasQuadras } from "@/components/horarios/agenda-das-quadras";
import { ResumoDoDia } from "@/components/horarios/resumo-do-dia";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoIcone, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { DIAS_SEMANA, formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { agendaDoDia } from "@/lib/horarios/agenda";
import type { Grade } from "@/lib/horarios/tipos";
import { minutoEmSaoPaulo } from "@/lib/painel/inicio";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Horários | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * HOR-CA-02 e VIVO-CA-06: grade do dia. A faixa de dias escolhe a data, o resumo mostra
 * a ocupação e a legenda, e a agenda tem uma coluna por quadra com cada reserva num
 * bloco que ocupa todas as suas horas.
 */
export default async function PaginaGrade({ searchParams }: PageProps<"/horarios">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { data: pedida } = await searchParams;
  const agora = new Date();
  const hoje = hojeEmSaoPaulo(agora);
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const resposta = await chamarApi<Grade>(`/horarios/grade?data=${data}`);
  const agenda = resposta.ok ? agendaDoDia(resposta.dados, hoje, minutoEmSaoPaulo(agora)) : null;

  return (
    <>
      <Cabecalho
        etiqueta="Quadras de areia"
        icone="horarios"
        titulo={
          <>
            Horários das <Destaque>quadras</Destaque>
          </>
        }
        descricao={
          <>
            {DIAS_SEMANA[new Date(`${data}T12:00:00Z`).getUTCDay()]}, {formatarData(data)}
            {data === hoje && " (hoje)"}
          </>
        }
        testIdDescricao="dia-da-grade"
        acoes={
          <form action="/horarios" className="flex items-center gap-2">
            <label htmlFor="ir-para-data" className="sr-only">
              Ir para a data
            </label>
            <input
              id="ir-para-data"
              name="data"
              type="date"
              required
              defaultValue={data}
              className={`${classeCampo} w-auto`}
            />
            <button type="submit" className={classeBotaoIcone}>
              <Icone nome="seta" width={18} height={18} />
              <span className="sr-only">Ver a data</span>
            </button>
          </form>
        }
      />

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <FaixaDeDias data={data} hoje={hoje} caminho="/horarios" />
        {resposta.ok && agenda && agenda.horas.length > 0 && (
          <ResumoDoDia agenda={agenda} grade={resposta.dados} />
        )}
      </div>

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : !agenda || agenda.horas.length === 0 ? (
        <Vazio
          titulo="As quadras não funcionam neste dia da semana."
          acao={
            admin && (
              <Link href="/horarios/faixas" className={classeBotaoSecundario}>
                Configurar horários e preços
              </Link>
            )
          }
        >
          Escolha outro dia na faixa acima.
        </Vazio>
      ) : (
        <section
          aria-labelledby="titulo-agenda"
          className="superficie flex flex-col gap-4 rounded-[1.75rem] p-3 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2 sm:px-1 sm:pt-0">
            <h2 id="titulo-agenda" className="text-lg font-bold">
              Agenda das quadras
            </h2>
            <p className="text-apagado text-sm">
              {data < hoje
                ? "Este dia já passou."
                : agenda.livresParaReservar > 0
                  ? "Toque num horário livre para reservar."
                  : "Nenhum horário livre para reservar."}
            </p>
          </div>
          <AgendaDasQuadras agenda={agenda} data={data} />
        </section>
      )}
    </>
  );
}
