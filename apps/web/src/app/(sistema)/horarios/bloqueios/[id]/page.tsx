import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cancelarBloqueio } from "@/app/acoes/horarios";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { CabecalhoCartao } from "@/components/base/cartao";
import { Icone } from "@/components/icones";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso, classeBotaoSecundario, classeCartao } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { DIAS_SEMANA, formatarData } from "@/lib/aulas/formatacao";
import { faixaDeHoras, tempoAteInicio } from "@/lib/horarios/formatacao";
import type { BloqueioDetalhe } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Bloqueio | Só Dois Toques" };

/** FOCO-CA-07: o bloqueio, quem criou e, para o administrador, o cancelamento. */
export default async function PaginaBloqueio({
  params,
  searchParams,
}: PageProps<"/horarios/bloqueios/[id]">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { id } = await params;
  const { criados } = await searchParams;
  const resposta = await chamarApi<BloqueioDetalhe>(
    `/horarios/bloqueios/${encodeURIComponent(id)}`,
  );
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const b = resposta.dados;
  const podeCancelar = admin && !b.canceladoEm && tempoAteInicio(b.inicio) > 0;
  const quantos = Number(criados);
  const dia = `${DIAS_SEMANA[new Date(`${b.data}T12:00:00Z`).getUTCDay()]}, ${formatarData(b.data)}`;

  return (
    <>
      <Cabecalho
        etiqueta={b.quadra.nome}
        icone="bloqueio"
        titulo={
          <>
            Horário <Destaque>bloqueado</Destaque>
          </>
        }
        descricao={`${dia} · ${faixaDeHoras(b.horaInicio, b.horaFim)}`}
        acoes={
          <Link
            href={`/horarios?data=${b.data}&quadra=${b.quadra.id}`}
            className={classeBotaoSecundario}
          >
            <Icone nome="grade" width={18} height={18} />
            Ver na agenda
          </Link>
        }
      />
      {Number.isInteger(quantos) && quantos > 0 && (
        <Aviso tipo="sucesso">
          {quantos === 1 ? "Horário bloqueado." : `${quantos} datas bloqueadas, uma por semana.`}
        </Aviso>
      )}
      {b.canceladoEm && (
        <Aviso tipo="info">
          Cancelado em {formatarDataHora(b.canceladoEm)} por {b.canceladoPor}. Motivo:{" "}
          {b.motivoCancelamento}
        </Aviso>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]">
        <section
          aria-labelledby="titulo-bloqueio"
          className={`${classeCartao} flex flex-col gap-4`}
        >
          <CabecalhoCartao
            id="titulo-bloqueio"
            icone="bloqueio"
            titulo={b.motivo}
            descricao={`${dia}, ${faixaDeHoras(b.horaInicio, b.horaFim)}`}
          />
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="bg-elevado/40 flex flex-col gap-1 rounded-2xl p-4">
              <dt className="text-apagado">Criado por</dt>
              <dd className="font-semibold">
                {b.criadoPor} · {formatarDataHora(b.criadoEm)}
              </dd>
            </div>
            <div className="bg-elevado/40 flex flex-col gap-1 rounded-2xl p-4">
              <dt className="text-apagado">Repetição</dt>
              <dd className="font-semibold">
                {b.serie
                  ? `Toda semana, de ${formatarData(b.serie.dataInicio)} a ${formatarData(b.serie.dataFim)}${b.serie.encerrada ? " (encerrado)" : ""}`
                  : "Só neste dia"}
              </dd>
            </div>
          </dl>
        </section>
        {podeCancelar && (
          <section
            aria-labelledby="titulo-liberar"
            className={`${classeCartao} flex flex-col gap-3`}
          >
            <CabecalhoCartao id="titulo-liberar" icone="fechar" titulo="Liberar horário" />
            <FormMotivo
              acao={cancelarBloqueio}
              campos={{ bloqueioId: b.id }}
              titulo="Liberar horário"
              explicacao="O horário volta a ficar livre na agenda."
              rotulo="Liberar horário"
              idCampo="motivo-cancelamento"
            />
          </section>
        )}
      </div>
    </>
  );
}
