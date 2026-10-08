import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { cancelarReserva, estornarPagamentoReserva } from "@/app/acoes/horarios";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { CabecalhoCartao } from "@/components/base/cartao";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { SeloIcone } from "@/components/base/selo";
import { FormPagamento } from "@/components/horarios/form-pagamento";
import { IngressoDaReserva } from "@/components/horarios/ingresso-da-reserva";
import { Icone, type NomeIcone } from "@/components/icones";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso, classeBotaoSecundario, classeCartao } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { tempoAteInicio } from "@/lib/horarios/formatacao";
import type { ReservaDetalhe } from "@/lib/horarios/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Reserva | Só Dois Toques" };

const DIA = 24 * 60 * 60 * 1000;

/**
 * HOR-CA-07 e 08: a reserva como um ingresso (quadra, dia e hora em cima; valor e
 * situação no canhoto), com o recebimento em blocos, os pagamentos, o estorno e o
 * cancelamento ao lado.
 */
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
  const soAdminCancela = !podeCancelar && !r.canceladaEm && falta > 0 && !bloqueio;
  const quantas = Number(criada);
  const receber = !r.canceladaEm && !bloqueio && !r.pago;
  const estornar = !r.canceladaEm && r.pago && admin;
  const lateral = receber || estornar || podeCancelar || soAdminCancela || r.pagamentos.length > 0;

  const ingresso = <IngressoDaReserva reserva={r} className={lateral ? "" : "max-w-2xl"} />;

  return (
    <>
      <Cabecalho
        etiqueta={bloqueio ? "Bloqueio" : "Reserva"}
        icone="horarios"
        titulo={
          bloqueio ? (
            <>
              Horário <Destaque>bloqueado</Destaque>
            </>
          ) : (
            <>
              Reserva de <Destaque>{r.clienteNome}</Destaque>
            </>
          )
        }
        descricao={`${r.quadra} · ${DIAS_SEMANA[new Date(`${r.data}T12:00:00Z`).getUTCDay()]}, ${formatarData(r.data)}`}
        acoes={
          <Link href={`/horarios?data=${r.data}`} className={classeBotaoSecundario}>
            <Icone nome="grade" width={18} height={18} />
            Ver na grade
          </Link>
        }
      />
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

      {lateral ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
          {ingresso}
          <div className="flex flex-col gap-4">
            {receber && <FormPagamento reservaId={r.id} valorCentavos={r.valorCentavos} />}
            {r.pagamentos.length > 0 && (
              <section
                aria-labelledby="titulo-pagamentos"
                className={`${classeCartao} flex flex-col gap-3`}
              >
                <CabecalhoCartao
                  id="titulo-pagamentos"
                  icone="recibo"
                  tom="sucesso"
                  titulo="Pagamentos"
                />
                <ul className="flex flex-col gap-1" aria-label="Pagamentos">
                  {r.pagamentos.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 py-2">
                      <SeloIcone
                        nome={
                          p.estornadoEm ? "estorno" : (ICONES_DAS_FORMAS[p.forma] ?? "dinheiro")
                        }
                        tom={p.estornadoEm ? "neutro" : "sucesso"}
                        tamanho="p"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p
                          className={p.estornadoEm ? "text-apagado line-through" : "font-semibold"}
                        >
                          {formatarReais(p.valorCentavos)} · {FORMAS[p.forma]}
                        </p>
                        <p className="text-apagado text-xs">
                          {p.recebidoPor} · {formatarDataHora(p.recebidoEm)}
                        </p>
                        {p.estornadoEm && (
                          <p className="text-suave text-sm">
                            Estornado em {formatarDataHora(p.estornadoEm)} por {p.estornadoPor}.
                            Motivo: {p.motivoEstorno}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {estornar && (
              <Acao icone="estorno" titulo="Estornar pagamento">
                <FormMotivo
                  acao={estornarPagamentoReserva}
                  campos={{ reservaId: r.id }}
                  titulo="Estornar pagamento"
                  explicacao="O valor sai do caixa e a reserva volta a ficar a pagar."
                  rotulo="Estornar pagamento"
                  idCampo="motivo-estorno"
                  confirmar="Uma saída de mesmo valor entra no Caixa agora e a reserva volta a ficar a pagar. O pagamento continua no histórico, marcado como estornado."
                />
              </Acao>
            )}
            {podeCancelar && (
              <Acao
                icone={bloqueio ? "bloqueio" : "fechar"}
                titulo={bloqueio ? "Liberar horário" : "Cancelar reserva"}
              >
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
                  confirmar={
                    bloqueio
                      ? undefined
                      : r.pago
                        ? "A reserva é cancelada, o horário fica livre e o valor pago sai do Caixa como estorno."
                        : "A reserva é cancelada e o horário fica livre para outra pessoa."
                  }
                />
              </Acao>
            )}
            {soAdminCancela && (
              <p className="border-borda text-suave flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm">
                <Icone nome="relogio" width={18} height={18} className="text-ouro shrink-0" />
                Faltam menos de 24 horas: só o administrador pode cancelar.
              </p>
            )}
          </div>
        </div>
      ) : (
        ingresso
      )}
    </>
  );
}

/** Ação com motivo que abre no lugar (estornar, cancelar, liberar). */
function Acao({
  icone,
  titulo,
  children,
}: {
  icone: NomeIcone;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <details className="group superficie rounded-[1.5rem] p-2">
      <summary className="text-perigo hover:bg-perigo/10 flex min-h-12 list-none items-center gap-3 rounded-2xl px-3 font-semibold transition-colors [&::-webkit-details-marker]:hidden">
        <span className="bg-perigo/15 grid size-8 shrink-0 place-items-center rounded-xl">
          <Icone nome={icone} width={16} height={16} />
        </span>
        {titulo}
        <Icone
          nome="abaixo"
          width={18}
          height={18}
          className="ease-mola ml-auto transition-transform duration-300 group-open:rotate-180"
        />
      </summary>
      <div className="animate-entrar p-2 pt-3">{children}</div>
    </details>
  );
}
