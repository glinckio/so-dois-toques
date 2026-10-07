import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cancelarReserva, estornarPagamentoReserva } from "@/app/acoes/horarios";
import { FormPagamento } from "@/components/horarios/form-pagamento";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { DIAS_SEMANA, formatarData, formatarTelefone } from "@/lib/aulas/formatacao";
import { faixaDeHoras, tempoAteInicio } from "@/lib/horarios/formatacao";
import type { ReservaDetalhe } from "@/lib/horarios/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Reserva | Só Dois Toques" };

const DIA = 24 * 60 * 60 * 1000;

/** HOR-CA-07 e 08: detalhe da reserva, com pagamento, estorno e cancelamento. */
export default async function PaginaReserva({
  params,
  searchParams,
}: PageProps<"/horarios/reservas/[id]">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { id } = await params;
  const { criada } = await searchParams;
  const resposta = await chamarApi<ReservaDetalhe>(`/horarios/reservas/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const r = resposta.dados;
  const bloqueio = r.tipo === "BLOQUEIO";
  const falta = tempoAteInicio(r.inicio);
  const podeCancelar = !r.canceladaEm && falta > 0 && (admin || (!bloqueio && falta >= DIA));
  const quantas = Number(criada);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {bloqueio ? "Horário bloqueado" : `Reserva de ${r.clienteNome}`}
        </h1>
        <p className="opacity-80">
          {r.quadra} · {DIAS_SEMANA[new Date(`${r.data}T12:00:00Z`).getUTCDay()]},{" "}
          {formatarData(r.data)} · {faixaDeHoras(r.horaInicio, r.horaFim)}
        </p>
      </header>
      {Number.isInteger(quantas) && quantas > 0 && (
        <Aviso tipo="sucesso">
          {quantas === 1
            ? bloqueio
              ? "Horário bloqueado."
              : "Reserva criada."
            : `${quantas} datas criadas, uma por semana.`}
        </Aviso>
      )}
      {r.canceladaEm && (
        <Aviso tipo="info">
          Cancelada em {formatarDataHora(r.canceladaEm)} por {r.canceladaPor}. Motivo:{" "}
          {r.motivoCancelamento}
        </Aviso>
      )}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
        {bloqueio ? (
          <>
            <dt className="font-medium">Motivo</dt>
            <dd>{r.motivo}</dd>
          </>
        ) : (
          <>
            <dt className="font-medium">Telefone</dt>
            <dd>{r.clienteTelefone ? formatarTelefone(r.clienteTelefone) : "Não informado"}</dd>
            <dt className="font-medium">Valor</dt>
            <dd>
              {formatarReais(r.valorCentavos)} ·{" "}
              <span data-testid="situacao-pagamento">{r.pago ? "Pago" : "A pagar"}</span>
            </dd>
          </>
        )}
        {r.serie && (
          <>
            <dt className="font-medium">Fixa</dt>
            <dd>
              Toda semana de {formatarData(r.serie.dataInicio)} a {formatarData(r.serie.dataFim)}
              {r.serie.encerrada ? " (encerrada)" : ""} ·{" "}
              <Link href="/horarios/fixas" className="underline">
                ver fixas
              </Link>
            </dd>
          </>
        )}
        <dt className="font-medium">Criada por</dt>
        <dd>
          {r.criadaPor} em {formatarDataHora(r.criadaEm)}
        </dd>
      </dl>

      {r.pagamentos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Pagamentos</h2>
          <ul className="flex flex-col gap-2" aria-label="Pagamentos">
            {r.pagamentos.map((p) => (
              <li key={p.id} className="rounded-lg border border-current/15 p-3">
                <p className={p.estornadoEm ? "line-through opacity-70" : ""}>
                  {formatarReais(p.valorCentavos)} · {FORMAS[p.forma]} · {p.recebidoPor} ·{" "}
                  {formatarDataHora(p.recebidoEm)}
                </p>
                {p.estornadoEm && (
                  <p className="text-sm opacity-80">
                    Estornado em {formatarDataHora(p.estornadoEm)} por {p.estornadoPor}. Motivo:{" "}
                    {p.motivoEstorno}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!r.canceladaEm && !bloqueio && !r.pago && (
        <FormPagamento reservaId={r.id} valorCentavos={r.valorCentavos} />
      )}
      {!r.canceladaEm && r.pago && admin && (
        <details>
          <summary className="cursor-pointer underline">Estornar pagamento</summary>
          <div className="pt-2">
            <FormMotivo
              acao={estornarPagamentoReserva}
              campos={{ reservaId: r.id }}
              titulo="Estornar pagamento"
              explicacao="O valor sai do caixa e a reserva volta a ficar a pagar."
              rotulo="Estornar pagamento"
              idCampo="motivo-estorno"
            />
          </div>
        </details>
      )}
      {podeCancelar ? (
        <details>
          <summary className="cursor-pointer underline">
            {bloqueio ? "Liberar horário" : "Cancelar reserva"}
          </summary>
          <div className="pt-2">
            <FormMotivo
              acao={cancelarReserva}
              campos={{ reservaId: r.id }}
              titulo={bloqueio ? "Liberar horário" : "Cancelar reserva"}
              explicacao={
                r.pago
                  ? "O horário fica livre e o valor pago é devolvido (estornado no caixa)."
                  : "O horário fica livre para outra reserva."
              }
              rotulo={bloqueio ? "Liberar horário" : "Cancelar reserva"}
              idCampo="motivo-cancelamento"
            />
          </div>
        </details>
      ) : (
        !r.canceladaEm &&
        falta > 0 &&
        !bloqueio && (
          <p className="text-sm opacity-80">
            Faltam menos de 24 horas: só o administrador pode cancelar.
          </p>
        )
      )}
    </>
  );
}
