import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { FaixaDeDias } from "@/components/base/faixa-de-dias";
import { Vazio } from "@/components/base/vazio";
import { FormAvulso } from "@/components/caixa/form-avulso";
import { FormFechamento } from "@/components/caixa/form-fechamento";
import { LinhaDoTempo } from "@/components/caixa/linha-do-tempo";
import { BlocosDasFormas, NumerosDoDia } from "@/components/caixa/resumo";
import { CaixaAberto, CaixaFechado } from "@/components/caixa/turno";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoIcone, classeCampo } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { CaixaDoDia } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { sessaoDoCaixa } from "@/lib/servidor/caixa";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Caixa | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * MENS-CA-17 e VIVO-CA-08: o painel ao vivo do caixa (aberto há quanto tempo, troco e
 * esperado), os avulsos e o fechamento, e o dia escolhido: números, formas de
 * pagamento e a linha do tempo dos lançamentos.
 */
export default async function PaginaCaixa({ searchParams }: PageProps<"/caixa">) {
  await connection();
  const agora = new Date();
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo(agora);
  const data = typeof pedida === "string" && DATA.test(pedida) ? pedida : hoje;
  const { usuario } = await exigirArea("caixa");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const [resposta, atual] = await Promise.all([
    chamarApi<CaixaDoDia>(`/caixa/lancamentos?data=${data}`),
    sessaoDoCaixa(),
  ]);
  const turno = atual.ok ? atual.dados.turno : null;
  const dataLonga = DATA_LONGA.format(new Date(`${data}T12:00:00Z`));
  // Mais recentes primeiro: o que acabou de ser lançado aparece no alto.
  const lancamentos = resposta.ok ? [...resposta.dados.lancamentos].reverse() : [];

  return (
    <>
      <Cabecalho
        etiqueta="Caixa"
        icone="caixa"
        titulo={
          <>
            Caixa do <Destaque>dia</Destaque>
          </>
        }
        descricao={
          <span className="first-letter:uppercase">
            {data === hoje ? `Hoje, ${dataLonga}` : dataLonga}
          </span>
        }
        acoes={
          <form action="/caixa" className="flex items-center gap-2">
            <label htmlFor="data" className="sr-only">
              Ir para o dia
            </label>
            <input
              id="data"
              name="data"
              type="date"
              max={hoje}
              defaultValue={data}
              className={`${classeCampo} max-w-44`}
            />
            <button type="submit" className={classeBotaoIcone}>
              <Icone nome="seta" width={18} height={18} />
              <span className="sr-only">Ver o dia</span>
            </button>
          </form>
        }
      />

      {!atual.ok ? (
        <Aviso tipo="erro">{atual.mensagem}</Aviso>
      ) : turno ? (
        <CaixaAberto turno={turno} agora={agora} />
      ) : (
        <CaixaFechado />
      )}

      {turno && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <FormAvulso />
          <FormFechamento turnoId={turno.id} esperadoCentavos={turno.esperadoDinheiroCentavos} />
        </div>
      )}

      <FaixaDeDias data={data} hoje={hoje} caminho="/caixa" rotulo="Dia do caixa" ateHoje />

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <>
          <section aria-label="Resumo do dia" className="flex flex-col gap-4">
            <NumerosDoDia resumo={resposta.dados.resumo} />
            <Cartao aria-labelledby="titulo-formas" className="flex flex-col gap-5">
              <CabecalhoCartao
                id="titulo-formas"
                icone="cartao"
                tom="areia"
                titulo="Por forma de pagamento"
                descricao="Saldo de cada forma e a parte dela nas entradas do dia"
              />
              <BlocosDasFormas
                porForma={resposta.dados.resumo.porForma}
                rotulo="Saldo por forma de pagamento"
              />
            </Cartao>
          </section>

          <Cartao aria-labelledby="titulo-lancamentos" className="flex flex-col gap-5">
            <CabecalhoCartao
              id="titulo-lancamentos"
              icone="lista"
              titulo="Lançamentos"
              descricao={
                lancamentos.length === 0
                  ? "Nada lançado neste dia"
                  : `${lancamentos.length} ${lancamentos.length === 1 ? "lançamento" : "lançamentos"} · mais recentes primeiro`
              }
            />
            {lancamentos.length === 0 ? (
              <Vazio compacto titulo="Nenhum lançamento neste dia.">
                Mensalidades, vendas, reservas e avulsos pagos neste dia aparecem aqui.
              </Vazio>
            ) : (
              <LinhaDoTempo
                itens={lancamentos}
                rotulo="Lançamentos"
                estornar={admin && Boolean(turno)}
              />
            )}
          </Cartao>
        </>
      )}
    </>
  );
}
