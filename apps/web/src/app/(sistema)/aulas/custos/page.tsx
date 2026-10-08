import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { estornarPagamentoQuadra } from "@/app/acoes/custos";
import { SeletorDeMes } from "@/components/aulas/seletor-de-mes";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { FormPagamentoQuadra } from "@/components/custos/form-pagamento-quadra";
import { FormValorHora } from "@/components/custos/form-valor-hora";
import { Icone } from "@/components/icones";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { AcessoNegado, Aviso, classeBotao } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { formatarHoras, partePaga, proporcoes } from "@/lib/custos/formatacao";
import type { CustoDoLocal, CustosDoMes } from "@/lib/custos/tipos";
import {
  competenciaAtual,
  competenciaValida,
  FORMAS,
  formatarReais,
  nomeDoMes,
} from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Custos das quadras | Só Dois Toques" };

/** CUSTO-CA-01 a 04: valor da hora, horas do mês, previsto e pagamentos às quadras. */
export default async function PaginaCustos({ searchParams }: PageProps<"/aulas/custos">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido || usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { competencia: pedida } = await searchParams;
  const competencia =
    typeof pedida === "string" && competenciaValida(pedida) ? pedida : competenciaAtual();
  const resposta = await chamarApi<CustosDoMes>(`/custos?competencia=${competencia}`);

  return (
    <>
      <Cabecalho
        etiqueta="Aulas"
        icone="dinheiro"
        titulo={
          <>
            Custos das <Destaque>quadras</Destaque>
          </>
        }
        descricao="Horas de aula de cada quadra parceira no mês e o custo previsto pelo valor da hora. O que você paga sai do Caixa."
        acoes={<SeletorDeMes competencia={competencia} caminho="/aulas/custos" />}
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : resposta.dados.locais.length === 0 ? (
        <Vazio
          titulo="Nenhuma quadra parceira cadastrada."
          acao={
            <Link href="/aulas/locais" className={classeBotao}>
              <Icone nome="local" width={18} height={18} />
              Cadastrar em Locais
            </Link>
          }
        >
          As quadras parceiras cobram por hora de aula; a própria não entra aqui.
        </Vazio>
      ) : (
        <>
          <Totais totais={resposta.dados.totais} competencia={competencia} />
          <ul className="flex flex-col gap-4" aria-label="Quadras parceiras">
            {resposta.dados.locais.map((local, i) => (
              <Local key={local.id} local={local} competencia={competencia} indice={i} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Destaque da tela: quanto do custo previsto do mês já foi pago, numa barra. */
function Totais({ totais, competencia }: { totais: CustosDoMes["totais"]; competencia: string }) {
  const parte = partePaga(totais.pagoCentavos, totais.previstoCentavos);
  const falta = totais.previstoCentavos - totais.pagoCentavos;
  return (
    <section
      aria-label="Totais do mês"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.6fr]"
    >
      <div className="superficie flex flex-col gap-3 rounded-[1.6rem] p-5">
        <span className="flex items-center gap-2.5">
          <SeloIcone nome="relogio" tom="roxo" tamanho="p" />
          <span className="text-suave text-sm font-semibold">Horas de aula</span>
        </span>
        <span className="text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums">
          {formatarHoras(totais.minutos)}
        </span>
        <span className="text-apagado text-xs">
          nas quadras parceiras em {nomeDoMes(competencia)}
        </span>
      </div>
      <div className="superficie flex flex-col gap-3 rounded-[1.6rem] p-5">
        <span className="flex items-center gap-2.5">
          <SeloIcone nome="dinheiro" tom="ouro" tamanho="p" />
          <span className="text-suave text-sm font-semibold">Custo previsto</span>
        </span>
        <NumeroAnimado
          valor={totais.previstoCentavos}
          centavosMenores
          className="text-[1.75rem] leading-none font-extrabold tracking-tight"
        />
        <span className="text-apagado text-xs">horas × valor da hora de cada quadra</span>
      </div>
      <div className="superficie-destaque flex flex-col gap-3 rounded-[1.6rem] p-5 sm:col-span-2 xl:col-span-1">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <SeloIcone nome="check" tom="sucesso" tamanho="p" />
            <span className="text-suave text-sm font-semibold">Pago</span>
          </span>
          {parte !== null && (
            <span className="text-sm font-bold tabular-nums">{Math.round(parte * 100)}%</span>
          )}
        </span>
        <NumeroAnimado
          valor={totais.pagoCentavos}
          centavosMenores
          className="text-[1.75rem] leading-none font-extrabold tracking-tight"
        />
        <BarraNivel
          fracao={parte ?? 0}
          tom={parte !== null && parte >= 1 ? "sucesso" : "ouro"}
          rotulo={
            parte === null
              ? "Sem custo previsto no mês"
              : `Pago ${formatarReais(totais.pagoCentavos)} de ${formatarReais(totais.previstoCentavos)} previstos`
          }
        />
        <span className="text-apagado text-xs">
          {parte === null
            ? "Defina o valor da hora para prever o custo."
            : falta > 0
              ? `Falta pagar ${formatarReais(falta)}.`
              : "O previsto do mês está pago."}
        </span>
      </div>
    </section>
  );
}

function Local({
  local,
  competencia,
  indice,
}: {
  local: CustoDoLocal;
  competencia: string;
  indice: number;
}) {
  const diferenca =
    local.previstoCentavos === null ? null : local.previstoCentavos - local.pagoCentavos;
  const parte = partePaga(local.pagoCentavos, local.previstoCentavos);
  const horasDasTurmas = proporcoes(local.turmas.map((t) => t.minutos));
  return (
    <li
      className={`superficie animate-entrar flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6 atraso-${Math.min(24, indice * 2)} ${local.ativo ? "" : "opacity-75"}`}
      aria-label={local.nome}
    >
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SeloIcone nome="local" tom="ouro" />
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-lg leading-tight font-bold">
                {local.nome}
                {local.ativo ? "" : " (inativo)"}
              </h2>
              <p className="text-suave text-sm" data-testid="resumo-local">
                {formatarHoras(local.minutos)} de aula · previsto{" "}
                {local.previstoCentavos === null
                  ? "sem valor da hora"
                  : formatarReais(local.previstoCentavos)}{" "}
                · pago {formatarReais(local.pagoCentavos)}
                {diferenca !== null && diferenca > 0 && ` · falta ${formatarReais(diferenca)}`}
              </p>
            </div>
          </div>
          {parte !== null &&
            (parte >= 1 ? <Selo tom="sucesso">Mês pago</Selo> : <Selo tom="ouro">A pagar</Selo>)}
        </div>
        {parte !== null && (
          <BarraNivel
            fracao={parte}
            tom={parte >= 1 ? "sucesso" : "ouro"}
            altura="h-2"
            rotulo={`${local.nome}: pago ${formatarReais(local.pagoCentavos)} de ${formatarReais(local.previstoCentavos ?? 0)} previstos`}
          />
        )}
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <FormValorHora localId={local.id} valorHoraCentavos={local.valorHoraCentavos} />
          {local.turmas.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                Turmas no mês
              </h3>
              <ul className="flex flex-col gap-2.5">
                {local.turmas.map((t, i) => (
                  <li key={t.id} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <Link
                        href={`/aulas/turmas/${t.id}`}
                        className="hover:text-roxo-claro truncate font-semibold transition-colors"
                      >
                        {t.nome}
                      </Link>
                      <span className="text-suave shrink-0 tabular-nums">
                        {formatarHoras(t.minutos)}
                      </span>
                    </span>
                    <BarraNivel
                      fracao={horasDasTurmas[i] ?? 0}
                      altura="h-1.5"
                      rotulo={`${t.nome}: ${formatarHoras(t.minutos)} de aula no mês`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {local.pagamentos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-apagado text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                Pagamentos de {nomeDoMes(competencia)}
              </h3>
              <ul className="flex flex-col gap-2" aria-label={`Pagamentos a ${local.nome}`}>
                {local.pagamentos.map((p) => (
                  <li
                    key={p.id}
                    className="border-borda bg-elevado/40 flex flex-col gap-2 rounded-2xl border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${p.estornadoEm ? "bg-elevado text-apagado" : "bg-ouro/15 text-ouro"}`}
                      >
                        <Icone
                          nome={ICONES_DAS_FORMAS[p.forma] ?? "dinheiro"}
                          width={17}
                          height={17}
                        />
                      </span>
                      <p
                        className={`min-w-0 flex-1 text-sm ${p.estornadoEm ? "text-apagado line-through" : ""}`}
                      >
                        <span className="font-bold tabular-nums">
                          {formatarReais(p.valorCentavos)}
                        </span>{" "}
                        · {FORMAS[p.forma]} · {formatarData(p.data)} · pago por {p.pagoPor}
                      </p>
                      {p.estornadoEm && <Selo tom="neutro">estornado</Selo>}
                    </div>
                    {p.estornadoEm ? (
                      <Aviso tipo="info">
                        Estornado em {formatarDataHora(p.estornadoEm)}. Motivo: {p.motivoEstorno}
                      </Aviso>
                    ) : (
                      <details className="group">
                        <summary className="text-perigo/90 hover:text-perigo inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold">
                          <Icone nome="estorno" width={15} height={15} />
                          Estornar
                        </summary>
                        <div className="animate-entrar pt-2">
                          <FormMotivo
                            acao={estornarPagamentoQuadra}
                            campos={{ pagamentoId: p.id }}
                            titulo="Estornar pagamento à quadra"
                            explicacao="Lança uma entrada de mesmo valor no Caixa. O pagamento continua no histórico."
                            rotulo="Estornar pagamento"
                            idCampo={`motivo-estorno-${p.id}`}
                          />
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <FormPagamentoQuadra
            localId={local.id}
            localNome={local.nome}
            competencia={competencia}
            sugeridoCentavos={diferenca !== null && diferenca > 0 ? diferenca : null}
            hoje={hojeEmSaoPaulo()}
          />
        </div>
      </div>
    </li>
  );
}
