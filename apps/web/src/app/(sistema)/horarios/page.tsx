import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FaixaDeDias } from "@/components/base/faixa-de-dias";
import { AgendaDaQuadra } from "@/components/horarios/agenda-da-quadra";
import { EscolhaDaQuadra } from "@/components/horarios/escolha-da-quadra";
import { ResumoDoDia } from "@/components/horarios/resumo-do-dia";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoIcone, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { DIAS_SEMANA, formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { agendaDoDia } from "@/lib/horarios/agenda";
import type { Grade, Quadra } from "@/lib/horarios/tipos";
import { minutoEmSaoPaulo } from "@/lib/painel/inicio";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Horários | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * FOCO-CA-05 e 08, GASTO-CA-02: a agenda do dia de uma quadra, com as aulas das turmas
 * e os bloqueios; as quadras ativas aparecem no topo para trocar.
 * A faixa de dias escolhe a data e o resumo mostra a ocupação e a legenda. Todos os
 * perfis veem; só o administrador bloqueia.
 */
export default async function PaginaAgenda({ searchParams }: PageProps<"/horarios">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { data: pedida, quadra: quadraPedida } = await searchParams;
  const agora = new Date();
  const hoje = hojeEmSaoPaulo(agora);
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const quadraId =
    typeof quadraPedida === "string" && UUID.test(quadraPedida) ? quadraPedida : null;
  const [resposta, quadras] = await Promise.all([
    chamarApi<Grade>(`/horarios/grade?data=${data}${quadraId ? `&quadra=${quadraId}` : ""}`),
    chamarApi<Quadra[]>("/horarios/quadras"),
  ]);
  const ativas = quadras.ok ? quadras.dados.filter((q) => q.ativa) : [];
  const atual = resposta.ok ? resposta.dados.quadra.id : (quadraId ?? "");
  const parametros = quadraId ? `&quadra=${quadraId}` : "";
  const agenda = resposta.ok ? agendaDoDia(resposta.dados, hoje, minutoEmSaoPaulo(agora)) : null;

  return (
    <>
      <Cabecalho
        etiqueta={resposta.ok ? resposta.dados.quadra.nome : "Quadra"}
        icone="horarios"
        titulo={
          <>
            Agenda da <Destaque>quadra</Destaque>
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
            {quadraId && <input type="hidden" name="quadra" value={quadraId} />}
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

      {ativas.length > 1 && <EscolhaDaQuadra quadras={ativas} atual={atual} data={data} />}

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <FaixaDeDias data={data} hoje={hoje} caminho="/horarios" parametros={parametros} />
        {agenda && <ResumoDoDia agenda={agenda} />}
      </div>

      {!resposta.ok || !agenda ? (
        <Aviso tipo="erro">{resposta.ok ? "Agenda indisponível." : resposta.mensagem}</Aviso>
      ) : (
        <section
          aria-labelledby="titulo-agenda"
          className="superficie flex flex-col gap-4 rounded-[1.75rem] p-3 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-2 sm:px-1 sm:pt-0">
            <h2 id="titulo-agenda" className="text-lg font-bold">
              {resposta.dados.quadra.nome}
            </h2>
            <p className="text-apagado text-sm">
              {data < hoje
                ? "Este dia já passou."
                : admin && agenda.livresParaBloquear > 0
                  ? "Toque numa hora livre para bloquear."
                  : "As aulas vêm das turmas; os bloqueios, do administrador."}
            </p>
          </div>
          <AgendaDaQuadra
            agenda={agenda}
            quadraId={resposta.dados.quadra.id}
            data={data}
            admin={admin}
            linkDaTurma={usuario.areas.includes("aulas")}
          />
        </section>
      )}

      {admin && (
        <div>
          <Link href="/horarios/quadras" className={classeBotaoSecundario}>
            <Icone nome="editar" width={16} height={16} />
            Quadras alugadas
          </Link>
        </div>
      )}
    </>
  );
}
