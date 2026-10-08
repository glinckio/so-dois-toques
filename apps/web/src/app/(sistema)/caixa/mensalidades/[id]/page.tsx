import type { Metadata } from "next";
import { connection } from "next/server";
import { cancelarMensalidade, estornarPagamento } from "@/app/acoes/mensalidades";
import { Avatar } from "@/components/base/avatar";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { SeloDaSituacao } from "@/components/caixa/situacao";
import { Icone } from "@/components/icones";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { FormPagamento } from "@/components/mensalidades/form-pagamento";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { FORMAS, nomeDoMes } from "@/lib/mensalidades/formatacao";
import type { MensalidadeDetalhe } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Mensalidade | Só Dois Toques" };

/** MENS-CA-09 a 13: a mensalidade do aluno, o pagamento e o histórico com os recibos. */
export default async function PaginaMensalidade({ params }: PageProps<"/caixa/mensalidades/[id]">) {
  await connection();
  const { usuario } = await exigirArea("caixa");
  const { id } = await params;
  const resposta = await chamarApi<MensalidadeDetalhe>(`/mensalidades/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const m = resposta.dados;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const devida = m.situacao === "EM_ABERTO" || m.situacao === "ATRASADA";

  const pagamentos = (
    <Cartao aria-labelledby="titulo-pagamentos" className="flex flex-col gap-4">
      <CabecalhoCartao
        id="titulo-pagamentos"
        icone="recibo"
        tom="areia"
        titulo="Pagamentos"
        descricao="Cada pagamento tem o seu recibo"
      />
      {m.pagamentos.length === 0 ? (
        <Vazio compacto titulo="Nenhum pagamento registrado." />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Pagamentos">
          {m.pagamentos.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-3 rounded-[1.4rem] border p-4 ${
                p.estorno ? "border-borda bg-elevado/25" : "border-sucesso/25 bg-sucesso/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <SeloIcone
                  nome={ICONES_DAS_FORMAS[p.forma] ?? "dinheiro"}
                  tom={p.estorno ? "neutro" : "sucesso"}
                  tamanho="p"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Recibo nº {p.numeroRecibo}</span>
                    {p.estorno ? (
                      <Selo tom="neutro">Estornado</Selo>
                    ) : (
                      <Selo tom="sucesso">Pago</Selo>
                    )}
                  </p>
                  <p className="text-apagado text-sm">
                    {FORMAS[p.forma]} · {formatarData(p.data)} · recebido por {p.recebidoPor}
                  </p>
                </div>
                <Valor
                  centavos={p.valorCentavos}
                  className={`shrink-0 text-lg font-extrabold ${p.estorno ? "text-apagado line-through" : ""}`}
                />
              </div>
              <LinkDoCartao href={`/caixa/recibos/${p.id}`}>Ver recibo</LinkDoCartao>
              {p.estorno ? (
                <Aviso tipo="info">
                  Estornado em {formatarDataHora(p.estorno.em)}. Motivo: {p.estorno.motivo}
                </Aviso>
              ) : (
                admin && (
                  <FormMotivo
                    acao={estornarPagamento}
                    campos={{ pagamentoId: p.id }}
                    titulo="Estornar pagamento"
                    explicacao="Lança uma saída de mesmo valor no Caixa e a mensalidade volta a ficar devida. O pagamento continua no histórico."
                    rotulo="Estornar pagamento"
                    idCampo={`motivo-estorno-${p.id}`}
                    confirmar="Uma saída de mesmo valor entra no Caixa agora e a mensalidade volta a ficar devida. O recibo continua no histórico, marcado como estornado."
                  />
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );

  return (
    <>
      <header
        className={`relative grid gap-5 overflow-hidden rounded-[2rem] p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7 ${
          devida ? "superficie-destaque" : "superficie"
        }`}
      >
        <span
          aria-hidden="true"
          className="bg-roxo/20 absolute -top-24 -right-16 size-72 rounded-full blur-3xl"
        />
        <div className="relative flex min-w-0 items-center gap-4">
          <Avatar nome={m.aluno.nome} tamanho="g" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-roxo-claro inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
              <Icone nome="calendario" width={15} height={15} />
              Mensalidade de {nomeDoMes(m.competencia)}
            </span>
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
              {m.aluno.nome}
            </h1>
            <span data-testid="situacao" className="w-fit">
              <SeloDaSituacao situacao={m.situacao} />
            </span>
          </div>
        </div>
        <div className="relative flex flex-col gap-1 sm:items-end sm:text-right">
          <Valor
            centavos={m.valorCentavos}
            className={`text-[2.25rem] leading-none font-extrabold tracking-tight ${m.situacao === "CANCELADA" ? "text-apagado line-through" : ""}`}
          />
          <span
            className={`text-sm font-semibold ${m.situacao === "ATRASADA" ? "text-perigo" : "text-suave"}`}
          >
            Vence em {formatarData(m.vencimento)}
          </span>
        </div>
      </header>

      {m.cancelamento && (
        <Aviso tipo="info">
          Cancelada em {formatarDataHora(m.cancelamento.em)}. Motivo: {m.cancelamento.motivo}
        </Aviso>
      )}

      {devida ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <FormPagamento
            mensalidadeId={m.id}
            valorCentavos={m.valorCentavos}
            hoje={hojeEmSaoPaulo()}
          />
          {pagamentos}
        </div>
      ) : (
        pagamentos
      )}

      {admin && devida && (
        <details className="group">
          <summary className="text-suave hover:bg-elevado hover:text-texto inline-flex min-h-11 list-none items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
            <Icone
              nome="abaixo"
              width={16}
              height={16}
              className="transition-transform duration-200 group-open:rotate-180"
            />
            Não cobrar esta mensalidade
          </summary>
          <div className="animate-surgir pt-3">
            <FormMotivo
              acao={cancelarMensalidade}
              campos={{ mensalidadeId: m.id }}
              titulo="Cancelar mensalidade"
              explicacao="Use quando a mensalidade não deve ser cobrada (por exemplo, combinado com o aluno). Não mexe no Caixa."
              rotulo="Cancelar mensalidade"
              idCampo="motivo-cancelamento"
              confirmar="A mensalidade deixa de ser cobrada do aluno e sai das devidas. O Caixa não muda."
            />
          </div>
        </details>
      )}
    </>
  );
}
