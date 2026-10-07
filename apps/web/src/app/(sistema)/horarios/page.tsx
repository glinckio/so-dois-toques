import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aviso, classeBotaoSecundario, classeCampo } from "@/components/ui";
import { DIAS_SEMANA, formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import {
  celulasDaQuadra,
  horaAgoraEmSaoPaulo,
  horaPassou,
  horasDeFuncionamento,
  rotuloHora,
  somarDias,
} from "@/lib/horarios/formatacao";
import type { Grade } from "@/lib/horarios/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Horários | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** HOR-CA-02: grade do dia, com livre e ocupado em cada quadra. */
export default async function PaginaGrade({ searchParams }: PageProps<"/horarios">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const resposta = await chamarApi<Grade>(`/horarios/grade?data=${data}`);
  const horaAgora = horaAgoraEmSaoPaulo();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Horários das quadras</h1>
          <p className="opacity-80" data-testid="dia-da-grade">
            {DIAS_SEMANA[new Date(`${data}T12:00:00Z`).getUTCDay()]}, {formatarData(data)}
            {data === hoje && " (hoje)"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Link href={`/horarios?data=${somarDias(data, -1)}`} className={classeBotaoSecundario}>
            ← Dia anterior
          </Link>
          <Link href={`/horarios?data=${somarDias(data, 1)}`} className={classeBotaoSecundario}>
            Próximo dia →
          </Link>
          <form className="flex items-end gap-2" action="/horarios">
            <div className="flex flex-col gap-1">
              <label htmlFor="data" className="text-sm font-medium">
                Dia
              </label>
              <input
                id="data"
                name="data"
                type="date"
                defaultValue={data}
                className={classeCampo}
              />
            </div>
            <button type="submit" className={classeBotaoSecundario}>
              Ver
            </button>
          </form>
        </div>
      </header>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.faixas.length === 0 ? (
        <Aviso tipo="info">
          As quadras não funcionam neste dia da semana.{" "}
          {admin && (
            <Link href="/horarios/faixas" className="underline">
              Configurar horários e preços
            </Link>
          )}
        </Aviso>
      ) : (
        <GradeDoDia grade={resposta.dados} hoje={hoje} horaAgora={horaAgora} />
      )}
    </>
  );
}

function GradeDoDia({ grade, hoje, horaAgora }: { grade: Grade; hoje: string; horaAgora: number }) {
  const horas = horasDeFuncionamento(grade.faixas);
  const colunas = grade.quadras.map((q) => celulasDaQuadra(horas, q.reservas));
  return (
    <table className="w-full table-fixed border-collapse text-sm" aria-label="Grade do dia">
      <thead>
        <tr>
          <th scope="col" className="w-16 p-1 text-left">
            Hora
          </th>
          {grade.quadras.map((q) => (
            <th key={q.id} scope="col" className="p-1 text-left">
              {q.nome}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {horas.map((hora, linha) => (
          <tr key={hora} className="border-t border-current/10">
            <th scope="row" className="p-1 text-left align-top font-normal opacity-80">
              {rotuloHora(hora)}
            </th>
            {grade.quadras.map((quadra, i) => {
              const celula = colunas[i]?.[linha];
              if (!celula) return <td key={quadra.id} />;
              if (celula.tipo === "livre") {
                return (
                  <td key={quadra.id} className="p-1">
                    {horaPassou(grade.data, hora, hoje, horaAgora) ? (
                      <span className="block rounded-md px-2 py-2 opacity-50">Livre</span>
                    ) : (
                      <Link
                        href={`/horarios/nova?data=${grade.data}&quadra=${quadra.id}&hora=${hora}`}
                        className="block rounded-md border border-dashed border-current/30 px-2 py-2 hover:bg-current/10"
                        aria-label={`Reservar ${quadra.nome} às ${rotuloHora(hora)}`}
                      >
                        Livre
                      </Link>
                    )}
                  </td>
                );
              }
              const r = celula.reserva;
              const bloqueio = r.tipo === "BLOQUEIO";
              return (
                <td key={quadra.id} className="p-1">
                  <Link
                    href={`/horarios/reservas/${r.id}`}
                    className={`block rounded-md px-2 py-2 ${
                      bloqueio ? "bg-slate-500/20" : r.pago ? "bg-green-600/20" : "bg-amber-500/25"
                    } ${celula.primeira ? "" : "opacity-60"}`}
                  >
                    <span className="block truncate font-medium">
                      {bloqueio ? `Bloqueado: ${r.motivo}` : r.clienteNome}
                    </span>
                    {celula.primeira && !bloqueio && (
                      <span className="block truncate text-xs">
                        {formatarReais(r.valorCentavos)} · {r.pago ? "Pago" : "A pagar"}
                        {r.serieId ? " · fixa" : ""}
                      </span>
                    )}
                  </Link>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
