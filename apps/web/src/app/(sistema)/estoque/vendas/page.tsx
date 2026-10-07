import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { estornarVenda } from "@/app/acoes/estoque";
import { BarraNivel } from "@/components/base/barra";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { CabecalhoCartao, Cartao } from "@/components/base/cartao";
import { FaixaDeDias } from "@/components/base/faixa-de-dias";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { ICONES_DAS_FORMAS } from "@/components/base/opcoes";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { FormEstorno } from "@/components/estoque/form-estorno";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoIcone, classeBotaoOuro, classeCampo } from "@/components/ui";
import { formatarData, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { FORMAS_CURTAS, quando, resumoDasVendas } from "@/lib/estoque/resumos";
import type { VendasDoDia } from "@/lib/estoque/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Vendas do dia | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** ESTQ-CA-03 e 06: vendas de um dia, com estorno para o administrador. */
export default async function PaginaVendas({ searchParams }: PageProps<"/estoque/vendas">) {
  await connection();
  const { usuario } = await exigirArea("estoque");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { data: pedida } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const data = typeof pedida === "string" && DATA.test(pedida) && pedida <= hoje ? pedida : hoje;
  const resposta = await chamarApi<VendasDoDia>(`/estoque/vendas?data=${data}`);

  return (
    <>
      <Cabecalho
        etiqueta="Lanchonete"
        icone="recibo"
        titulo={
          <>
            Vendas do <Destaque>dia</Destaque>
          </>
        }
        descricao={data === hoje ? "Hoje" : formatarData(data)}
        acoes={
          <form className="flex items-center gap-2" action="/estoque/vendas">
            <label htmlFor="data" className="sr-only">
              Dia
            </label>
            <div className="w-44">
              <input
                id="data"
                name="data"
                type="date"
                max={hoje}
                defaultValue={data}
                className={classeCampo}
              />
            </div>
            <button type="submit" className={classeBotaoIcone}>
              <Icone nome="busca" width={18} height={18} />
              <span className="sr-only">Ver</span>
            </button>
          </form>
        }
      />
      <FaixaDeDias
        data={data}
        hoje={hoje}
        caminho="/estoque/vendas"
        rotulo="Escolher dia das vendas"
        ateHoje
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <Dia vendas={resposta.dados} admin={admin} ehHoje={data === hoje} />
      )}
    </>
  );
}

function Dia({ vendas, admin, ehHoje }: { vendas: VendasDoDia; admin: boolean; ehHoje: boolean }) {
  const resumo = resumoDasVendas(vendas.vendas);
  const maiorForma = Math.max(1, ...resumo.porForma.map((f) => f.totalCentavos));
  const top = resumo.maisVendidos.slice(0, 5);
  const maisVendido = top[0]?.quantidade ?? 1;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section
          aria-labelledby="titulo-total-dia"
          className="superficie-destaque relative flex flex-col justify-between gap-5 overflow-hidden rounded-[1.75rem] p-5 sm:p-6"
        >
          <span
            aria-hidden="true"
            className="bg-ouro/15 pointer-events-none absolute -top-16 -right-12 size-56 rounded-full blur-3xl"
          />
          <div className="relative flex flex-col gap-2">
            <h2
              id="titulo-total-dia"
              className="text-roxo-claro text-xs font-bold tracking-[0.14em] uppercase"
            >
              Total vendido
            </h2>
            <p
              data-testid="total-dia"
              className="text-[2.6rem] leading-none font-extrabold tracking-tight sm:text-5xl"
            >
              <NumeroAnimado valor={vendas.totalCentavos} centavosMenores />
            </p>
            <p className="text-suave text-sm">
              {resumo.quantidade} {resumo.quantidade === 1 ? "venda" : "vendas"} · {resumo.unidades}{" "}
              {resumo.unidades === 1 ? "item" : "itens"}
              {resumo.estornadas > 0 &&
                ` · ${resumo.estornadas} ${resumo.estornadas === 1 ? "estornada" : "estornadas"}`}
            </p>
          </div>
          <ul
            className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4"
            aria-label="Vendido por forma de pagamento"
          >
            {resumo.porForma.map((f) => (
              <li key={f.forma} className="bg-fundo/45 flex flex-col gap-2 rounded-2xl p-3">
                <span className="text-apagado flex items-center gap-1.5 text-xs font-semibold">
                  <Icone nome={ICONES_DAS_FORMAS[f.forma] ?? "dinheiro"} width={14} height={14} />
                  {FORMAS_CURTAS[f.forma]}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {formatarReais(f.totalCentavos)}
                </span>
                <BarraNivel
                  fracao={f.totalCentavos / maiorForma}
                  tom={f.totalCentavos === maiorForma && f.totalCentavos > 0 ? "ouro" : "roxo"}
                  altura="h-1.5"
                  rotulo={`${FORMAS[f.forma]}: ${f.vendas} ${f.vendas === 1 ? "venda" : "vendas"}`}
                />
              </li>
            ))}
          </ul>
        </section>

        <Cartao aria-labelledby="titulo-mais-vendidos" className="flex flex-col gap-4">
          <CabecalhoCartao
            id="titulo-mais-vendidos"
            icone="estrela"
            tom="ouro"
            titulo="Mais vendidos"
            descricao="Unidades no dia, sem as estornadas"
          />
          {top.length === 0 ? (
            <p className="text-apagado border-borda rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
              Nenhum item vendido neste dia.
            </p>
          ) : (
            <ol className="flex flex-col gap-3" aria-label="Produtos mais vendidos">
              {top.map((p, i) => (
                <li key={p.produto} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{p.produto}</span>
                    <span className="text-apagado shrink-0 text-xs tabular-nums">
                      <strong className="text-texto text-sm">{p.quantidade}</strong>{" "}
                      {p.quantidade === 1 ? "unidade" : "unidades"}
                    </span>
                  </span>
                  <BarraNivel
                    fracao={p.quantidade / maisVendido}
                    tom={i === 0 ? "ouro" : "roxo"}
                    altura="h-2"
                    rotulo={`${p.produto}: ${p.quantidade} ${p.quantidade === 1 ? "unidade vendida" : "unidades vendidas"}`}
                  />
                </li>
              ))}
            </ol>
          )}
        </Cartao>
      </div>

      <Cartao aria-labelledby="titulo-vendas" className="flex flex-col gap-4">
        <CabecalhoCartao
          id="titulo-vendas"
          icone="carrinho"
          titulo="Vendas"
          descricao="Da mais recente para a mais antiga"
        />
        {vendas.vendas.length === 0 ? (
          <Vazio
            titulo="Nenhuma venda neste dia."
            compacto
            acao={
              ehHoje && (
                <Link href="/estoque/venda" className={`${classeBotaoOuro} min-h-11 px-5`}>
                  <Icone nome="carrinho" width={17} height={17} />
                  Ir para o balcão
                </Link>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-2.5" aria-label="Vendas">
            {vendas.vendas.map((v, i) => (
              <LinhaDaVenda key={v.id} venda={v} admin={admin} ordem={i} />
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}

/** Uma venda: forma em selo de ícone, itens em pílulas, total à direita e o estorno. */
function LinhaDaVenda({
  venda: v,
  admin,
  ordem,
}: {
  venda: VendasDoDia["vendas"][number];
  admin: boolean;
  ordem: number;
}) {
  const estornada = Boolean(v.estornadaEm);
  const feita = quando(v.feitaEm);
  return (
    <li
      className={`animate-entrar atraso-${Math.min(ordem, 16)} flex flex-col gap-3 rounded-2xl border p-3.5 sm:p-4 ${
        estornada ? "border-borda/70 bg-transparent" : "border-borda bg-elevado/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <SeloIcone
          nome={ICONES_DAS_FORMAS[v.forma] ?? "dinheiro"}
          tom={estornada ? "neutro" : "roxo"}
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-semibold ${estornada ? "text-apagado line-through" : ""}`}>
              {FORMAS[v.forma]}
            </span>
            {estornada && <Selo tom="perigo">Estornada</Selo>}
          </p>
          <p className="text-apagado text-xs">
            {feita.hora} · {v.feitaPor}
          </p>
        </div>
        <Valor
          centavos={v.totalCentavos}
          className={`shrink-0 text-lg font-extrabold ${estornada ? "text-apagado line-through" : ""}`}
        />
      </div>
      <p className="flex flex-wrap gap-1.5">
        {v.itens.map((item, i) => (
          <span key={`${item.produto}-${i}`} className="contents">
            {i > 0 && <span className="sr-only">, </span>}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                estornada ? "bg-elevado/50 text-apagado" : "bg-elevado text-suave"
              }`}
            >
              {item.quantidade} × {item.produto}
            </span>
          </span>
        ))}
      </p>
      {v.estornadaEm ? (
        <p className="text-suave border-perigo/25 bg-perigo/5 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm">
          <Icone nome="estorno" width={16} height={16} className="text-perigo mt-0.5 shrink-0" />
          <span>
            Estornada em {quando(v.estornadaEm).dia} às {quando(v.estornadaEm).hora}. Motivo:{" "}
            {v.motivoEstorno}
          </span>
        </p>
      ) : (
        admin && (
          <details className="group/estorno">
            <summary className="text-apagado hover:text-perigo inline-flex min-h-11 list-none items-center gap-2 rounded-full pr-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
              <Icone nome="estorno" width={16} height={16} />
              Estornar
            </summary>
            <div className="pt-1">
              <FormEstorno
                acao={estornarVenda}
                campos={{ vendaId: v.id }}
                titulo="Estornar venda"
                explicacao="Os produtos voltam ao estoque e o valor sai do caixa aberto."
                rotulo="Estornar venda"
                idCampo={`motivo-${v.id}`}
              />
            </div>
          </details>
        )
      )}
    </li>
  );
}
