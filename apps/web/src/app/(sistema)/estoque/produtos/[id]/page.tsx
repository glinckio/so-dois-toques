import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { estornarCompra } from "@/app/acoes/estoque";
import { Anel } from "@/components/base/anel";
import { BarraNivel } from "@/components/base/barra";
import { CabecalhoCartao, Cartao } from "@/components/base/cartao";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { SeloDoEstoque } from "@/components/estoque/cartao-produto";
import { FormAjuste } from "@/components/estoque/form-ajuste";
import { FormEstorno } from "@/components/estoque/form-estorno";
import { FormProduto } from "@/components/estoque/form-produto";
import { LinhaDoTempoDeMovimentos } from "@/components/estoque/movimentos";
import { Icone } from "@/components/icones";
import { Aviso, classeBotao, classeBotaoSecundario } from "@/components/ui";
import { formatarData } from "@/lib/aulas/formatacao";
import {
  custoPorUnidade,
  formatarMargem,
  margemSobrePreco,
  nivelDoEstoque,
  quando,
} from "@/lib/estoque/resumos";
import type { CompraDoProduto, Extrato, Produto } from "@/lib/estoque/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Produto | Só Dois Toques" };

const TOM_DA_BARRA = { zerado: "perigo", baixo: "ouro", ok: "roxo" } as const;

/** ESTQ-CA-07: extrato do produto; edição, ajuste e estorno de compra para o administrador. */
export default async function PaginaProduto({ params }: PageProps<"/estoque/produtos/[id]">) {
  await connection();
  const { usuario } = await exigirArea("estoque");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const { id } = await params;
  const caminho = encodeURIComponent(id);
  const [extrato, compras] = await Promise.all([
    chamarApi<Extrato>(`/produtos/${caminho}/movimentos`),
    chamarApi<CompraDoProduto[]>(`/produtos/${caminho}/compras`),
  ]);
  if (!extrato.ok) return <Aviso tipo="erro">{extrato.mensagem}</Aviso>;
  const { produto, movimentos } = extrato.dados;
  const listaDeCompras = compras.ok ? compras.dados : [];

  return (
    <>
      <Resumo produto={produto} />
      {admin && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <FormAjuste produtoId={produto.id} saldo={produto.saldo} />
          <FormProduto produto={produto} />
        </div>
      )}
      <div
        className={`grid items-start gap-4 ${listaDeCompras.length > 0 ? "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}
      >
        <Cartao aria-labelledby="titulo-movimentos" className="flex flex-col gap-5">
          <CabecalhoCartao
            id="titulo-movimentos"
            icone="lista"
            titulo="Movimentações"
            descricao={
              movimentos.length > 0
                ? `${movimentos.length} ${movimentos.length === 1 ? "registro" : "registros"}, com o saldo depois de cada um`
                : undefined
            }
          />
          {movimentos.length === 0 ? (
            <Vazio titulo="Nenhuma movimentação ainda." compacto>
              A primeira compra dá a entrada no estoque.
            </Vazio>
          ) : (
            <LinhaDoTempoDeMovimentos movimentos={movimentos} />
          )}
        </Cartao>
        {listaDeCompras.length > 0 && <Compras compras={listaDeCompras} admin={admin} />}
      </div>
      {!compras.ok && <Aviso tipo="erro">{compras.mensagem}</Aviso>}
    </>
  );
}

/**
 * O destaque da tela: o saldo em número grande com a barra do nível e a marca do
 * mínimo, a situação em selo e os números do produto (custo médio, preço e margem).
 */
function Resumo({ produto }: { produto: Produto }) {
  const nivel = nivelDoEstoque(produto);
  const margem = margemSobrePreco(produto.precoCentavos, produto.custoMedioCentavos);
  return (
    <header className="superficie-destaque relative grid grid-cols-1 gap-6 overflow-hidden rounded-[2rem] p-6 sm:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-center">
      <span
        aria-hidden="true"
        className="bg-roxo/25 pointer-events-none absolute -top-28 -right-20 size-80 rounded-full blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-ouro/10 pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full blur-3xl"
      />
      <div className="relative flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Link
            href="/estoque"
            className="text-roxo-claro hover:text-texto inline-flex w-fit items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase"
          >
            <Icone nome="voltar" width={15} height={15} />
            Produtos da lanchonete
          </Link>
          <h1 className="text-3xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-4xl">
            {produto.nome}
          </h1>
          <div className="flex flex-wrap gap-2">
            <SeloDoEstoque produto={produto} />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <p data-testid="resumo-produto" className="flex flex-wrap items-baseline gap-x-2">
            <NumeroAnimado
              valor={produto.saldo}
              formato="inteiro"
              className={`text-6xl leading-none font-extrabold tracking-tight ${nivel.situacao === "zerado" ? "text-perigo" : ""}`}
            />{" "}
            <span className="text-suave text-lg font-semibold">em estoque</span>
            <span className="text-apagado text-sm">
              {produto.estoqueMinimo > 0 ? ` · mínimo ${produto.estoqueMinimo}` : " · sem mínimo"}
              {produto.abaixoDoMinimo && " · abaixo do mínimo"}
            </span>
          </p>
          <BarraNivel
            fracao={nivel.fracao}
            marca={nivel.marca}
            tom={TOM_DA_BARRA[nivel.situacao]}
            rotulo={
              produto.estoqueMinimo > 0
                ? `${produto.saldo} em estoque; o mínimo é ${produto.estoqueMinimo}`
                : `${produto.saldo} em estoque; sem mínimo definido`
            }
          />
        </div>
        {produto.ativo && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/estoque/compra?produto=${produto.id}`} className={classeBotao}>
              <Icone nome="sacola" width={18} height={18} />
              Dar entrada
            </Link>
            <Link href="/estoque/venda" className={classeBotaoSecundario}>
              <Icone nome="carrinho" width={18} height={18} />
              Ir para o balcão
            </Link>
          </div>
        )}
      </div>

      <dl className="relative grid grid-cols-2 gap-3">
        <div className="vidro flex flex-col gap-1 rounded-[1.25rem] p-4">
          <dt className="text-apagado flex items-center gap-1.5 text-xs font-semibold">
            <Icone nome="dinheiro" width={14} height={14} />
            Preço de venda
          </dt>
          <dd className="text-2xl font-extrabold">
            <Valor centavos={produto.precoCentavos} />
          </dd>
        </div>
        <div className="vidro flex flex-col gap-1 rounded-[1.25rem] p-4">
          <dt className="text-apagado flex items-center gap-1.5 text-xs font-semibold">
            <Icone nome="sacola" width={14} height={14} />
            Custo médio
          </dt>
          <dd className="text-2xl font-extrabold">
            <Valor centavos={produto.custoMedioCentavos} />
          </dd>
        </div>
        <div className="vidro col-span-2 rounded-[1.25rem] p-4">
          <dt className="sr-only">Margem</dt>
          <dd className="flex items-center gap-4">
            <Anel
              fracao={margem === null ? 0 : Math.max(0, margem)}
              tom={margem !== null && margem < 0 ? "perigo" : "sucesso"}
              tamanho={72}
              rotulo={
                margem === null
                  ? "Margem ainda sem custo de compra"
                  : `Margem de ${formatarMargem(margem)} sobre o preço`
              }
            >
              <span className="text-sm font-extrabold tabular-nums">
                {margem === null ? "—" : formatarMargem(margem)}
              </span>
            </Anel>
            <span className="min-w-0">
              <span className="block font-bold" aria-hidden="true">
                Margem
              </span>
              <span className="text-apagado block text-sm">
                {margem === null
                  ? "Aparece depois da primeira compra."
                  : `${formatarReais(produto.precoCentavos - produto.custoMedioCentavos)} por unidade vendida`}
              </span>
            </span>
          </dd>
        </div>
      </dl>
    </header>
  );
}

/** Compras do produto, com o custo de cada unidade e o estorno para o administrador. */
function Compras({ compras, admin }: { compras: CompraDoProduto[]; admin: boolean }) {
  return (
    <Cartao aria-labelledby="titulo-compras" className="flex flex-col gap-5">
      <CabecalhoCartao
        id="titulo-compras"
        icone="sacola"
        tom="sucesso"
        titulo="Compras"
        descricao="Entradas pagas pelo Caixa"
      />
      <ul className="flex flex-col gap-2.5" aria-label="Compras">
        {compras.map((c) => {
          const estornada = Boolean(c.estornadaEm);
          const unidade = custoPorUnidade(c.totalCentavos, c.quantidade);
          return (
            <li
              key={c.id}
              className={`flex flex-col gap-3 rounded-2xl border p-3.5 ${
                estornada ? "border-borda/70" : "border-borda bg-elevado/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <SeloIcone nome="sacola" tom={estornada ? "neutro" : "sucesso"} tamanho="p" />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${estornada ? "text-apagado line-through" : ""}`}>
                    {c.quantidade} {c.quantidade === 1 ? "unidade" : "unidades"} por{" "}
                    {formatarReais(c.totalCentavos)}
                  </p>
                  <p className="text-apagado text-xs">
                    {FORMAS[c.forma]} · {formatarData(c.data)} · {c.feitaPor}
                  </p>
                </div>
                {estornada ? (
                  <Selo tom="perigo">Estornada</Selo>
                ) : (
                  unidade !== null && (
                    <span className="text-right text-sm font-bold tabular-nums">
                      {formatarReais(unidade)}
                      <span className="text-apagado block text-[0.7rem] font-semibold">
                        por unidade
                      </span>
                    </span>
                  )
                )}
              </div>
              {c.estornadaEm ? (
                <p className="text-suave border-perigo/25 bg-perigo/5 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm">
                  <Icone
                    nome="estorno"
                    width={16}
                    height={16}
                    className="text-perigo mt-0.5 shrink-0"
                  />
                  <span>
                    Estornada em {quando(c.estornadaEm).dia} às {quando(c.estornadaEm).hora}.
                    Motivo: {c.motivoEstorno}
                  </span>
                </p>
              ) : (
                admin && (
                  <details>
                    <summary className="text-apagado hover:text-perigo inline-flex min-h-11 list-none items-center gap-2 rounded-full pr-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden">
                      <Icone nome="estorno" width={16} height={16} />
                      Estornar
                    </summary>
                    <div className="pt-1">
                      <FormEstorno
                        acao={estornarCompra}
                        campos={{ compraId: c.id }}
                        titulo="Estornar compra"
                        explicacao="As unidades saem do estoque e o valor volta ao Caixa."
                        rotulo="Estornar compra"
                        idCampo={`motivo-${c.id}`}
                      />
                    </div>
                  </details>
                )
              )}
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
