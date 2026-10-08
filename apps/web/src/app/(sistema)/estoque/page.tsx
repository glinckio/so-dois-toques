import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Anel } from "@/components/base/anel";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { PontoVivo } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { CartaoProduto } from "@/components/estoque/cartao-produto";
import { FormProduto } from "@/components/estoque/form-produto";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoOuro, classeBotaoSecundario } from "@/components/ui";
import { valorEmEstoque } from "@/lib/estoque/resumos";
import type { Produto } from "@/lib/estoque/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Estoque | Só Dois Toques" };

/** ESTQ-CA-07: produtos com saldo, custo médio e alerta de mínimo. */
export default async function PaginaEstoque() {
  await connection();
  const { usuario } = await exigirArea("estoque");
  const admin = usuario.perfil === "ADMINISTRADOR";
  const resposta = await chamarApi<Produto[]>("/produtos");
  const produtos = resposta.ok
    ? [...resposta.dados.filter((p) => p.ativo), ...resposta.dados.filter((p) => !p.ativo)]
    : [];
  const ativos = produtos.filter((p) => p.ativo);
  const acabando = produtos.filter((p) => p.abaixoDoMinimo);

  return (
    <>
      <Cabecalho
        etiqueta="Lanchonete"
        icone="estoque"
        titulo={
          <>
            Estoque da <Destaque>lanchonete</Destaque>
          </>
        }
        descricao="O que tem na prateleira, quanto custou e o que precisa de reposição."
        acoes={
          admin && (
            <a href="#cadastrar-produto" className={classeBotaoSecundario}>
              <Icone nome="mais" width={18} height={18} />
              Novo produto
            </a>
          )
        }
      />

      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <Prateleira produtos={produtos} ativos={ativos} acabando={acabando} />
      )}

      {resposta.ok && (
        <div
          className={`grid items-start gap-4 ${admin ? "xl:grid-cols-[minmax(0,1fr)_23rem]" : ""}`}
        >
          <section aria-labelledby="titulo-produtos" className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="titulo-produtos" className="text-xl font-bold">
                Produtos
              </h2>
              <span className="text-apagado text-sm">
                {ativos.length} {ativos.length === 1 ? "ativo" : "ativos"}
                {produtos.length > ativos.length &&
                  ` · ${produtos.length - ativos.length} ${produtos.length - ativos.length === 1 ? "inativo" : "inativos"}`}
              </span>
            </div>
            {produtos.length === 0 ? (
              <Vazio
                titulo="Nenhum produto cadastrado."
                acao={
                  admin && (
                    <a href="#cadastrar-produto" className={classeBotaoSecundario}>
                      Cadastrar o primeiro
                    </a>
                  )
                }
              >
                Cadastre o que a lanchonete vende; a compra dá a entrada no estoque.
              </Vazio>
            ) : (
              <ul
                className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${admin ? "2xl:grid-cols-3" : "xl:grid-cols-3"}`}
                aria-label="Produtos"
              >
                {produtos.map((p, i) => (
                  <CartaoProduto key={p.id} produto={p} ordem={i} />
                ))}
              </ul>
            )}
          </section>
          {admin && (
            <div className="xl:sticky xl:top-6">
              <FormProduto id="cadastrar-produto" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * O destaque da tela: quanto vale a prateleira, quantos produtos estão em dia (anel)
 * e o que precisa de reposição, com o ponto dourado pulsando.
 */
function Prateleira({
  produtos,
  ativos,
  acabando,
}: {
  produtos: Produto[];
  ativos: Produto[];
  acabando: Produto[];
}) {
  const valor = valorEmEstoque(produtos);
  const emDia = ativos.filter((p) => !p.abaixoDoMinimo).length;
  const fracao = ativos.length > 0 ? emDia / ativos.length : 0;
  const zerados = acabando.filter((p) => p.saldo <= 0).length;
  return (
    <section
      aria-labelledby="titulo-prateleira"
      className="superficie-destaque relative grid grid-cols-1 gap-6 overflow-hidden rounded-[2rem] p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)]"
    >
      <span
        aria-hidden="true"
        className="bg-roxo/25 pointer-events-none absolute -top-24 -left-16 size-72 rounded-full blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-ouro/10 pointer-events-none absolute -right-20 -bottom-28 size-72 rounded-full blur-3xl"
      />
      <h2 id="titulo-prateleira" className="sr-only">
        Resumo da prateleira
      </h2>

      <div className="relative flex flex-col gap-2">
        <p className="text-roxo-claro text-xs font-bold tracking-[0.14em] uppercase">
          Na prateleira, a preço de venda
        </p>
        <NumeroAnimado
          valor={valor.vendaCentavos}
          centavosMenores
          className="text-[2.6rem] leading-none font-extrabold tracking-tight sm:text-5xl"
        />
        <p className="text-suave text-sm">
          {valor.unidades} {valor.unidades === 1 ? "unidade" : "unidades"} · custaram{" "}
          <strong className="text-texto">{formatarReais(valor.custoCentavos)}</strong>
        </p>
      </div>

      <div className="relative flex items-center gap-4 sm:flex-col sm:gap-2 sm:px-2 sm:text-center">
        <Anel
          fracao={fracao}
          tom="sucesso"
          tamanho={92}
          espessura={9}
          rotulo={`${emDia} de ${ativos.length} produtos ativos acima do mínimo`}
        >
          <span className="text-lg font-extrabold tabular-nums">
            {emDia}/{ativos.length}
          </span>
        </Anel>
        <p className="text-sm">
          <strong className="block">Produtos em dia</strong>
          <span className="text-apagado">acima do mínimo</span>
        </p>
      </div>

      <div className="vidro relative flex flex-col gap-3 rounded-[1.5rem] p-4 sm:col-span-2 xl:col-span-1">
        {acabando.length > 0 ? (
          <>
            <p className="flex items-center gap-2.5 text-sm font-bold">
              <PontoVivo tom="ouro" />
              Para repor
              {zerados > 0 && (
                <span className="text-perigo text-xs font-semibold">
                  · {zerados} {zerados === 1 ? "zerado" : "zerados"}
                </span>
              )}
            </p>
            <p className="text-suave text-sm">
              Abaixo do mínimo: {acabando.map((p) => `${p.nome} (${p.saldo})`).join(", ")}.
            </p>
            <Link href="/estoque/compra" className={`${classeBotaoOuro} min-h-11 self-start px-5`}>
              <Icone nome="sacola" width={17} height={17} />
              Registrar compra
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="bg-sucesso/20 text-sucesso grid size-11 shrink-0 place-items-center rounded-full">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="m5 12.5 4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={100}
                  strokeDasharray="100 200"
                  className="animate-desenhar [animation-delay:300ms]"
                />
              </svg>
            </span>
            <p className="text-sm">
              <strong className="block">Tudo em dia</strong>
              <span className="text-suave">Nenhum produto abaixo do mínimo.</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
