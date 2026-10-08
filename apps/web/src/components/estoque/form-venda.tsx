"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarVenda } from "@/app/acoes/estoque";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos, type Opcao } from "@/components/base/opcoes";
import { Selo, SeloIcone } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { ValorQueAcompanha } from "@/components/base/valor-que-acompanha";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoOuro } from "@/components/ui";
import {
  type LinhaDoBalcao,
  type ProdutoDoBalcao,
  ordemDoBalcao,
  quantidadeDepoisDoToque,
  quantidadesDosValores,
  resumoDoBalcao,
  textoDaQuantidade,
} from "@/lib/estoque/balcao";
import { FORMAS_CURTAS } from "@/lib/estoque/resumos";
import { type Forma, formatarReais } from "@/lib/mensalidades/formatacao";

export type ProdutoVenda = ProdutoDoBalcao & { abaixoDoMinimo: boolean };

const OPCOES_FORMA: Opcao[] = (Object.keys(FORMAS_CURTAS) as Forma[]).map((forma) => ({
  valor: forma,
  rotulo: FORMAS_CURTAS[forma],
  icone: ICONES_DAS_FORMAS[forma],
  detalhe: forma.startsWith("CARTAO") ? "Cartão" : undefined,
}));

const classePasso =
  "grid size-11 shrink-0 place-items-center rounded-full transition duration-200 ease-mola active:scale-90 disabled:pointer-events-none disabled:opacity-35";

/**
 * ESTQ-CA-03 e VIVO-CA-07: a venda como um balcão. Cada produto é um bloco com − e +
 * (o + para no saldo) e o campo continua digitável; o resumo fica preso à tela, com
 * os itens, a forma de pagamento em blocos e o total que corre até o valor novo.
 */
export function FormVenda({ produtos }: { produtos: ProdutoVenda[] }) {
  const [estado, acao, enviando] = useActionState(registrarVenda, ESTADO_INICIAL);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  // Depois de cada envio o balcão volta ao que a ação devolveu (vazio após a venda,
  // ou o que foi escolhido após um erro): os blocos e o total acompanham.
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estadoVisto !== estado) {
    setEstadoVisto(estado);
    setQuantidades(quantidadesDosValores(estado.valores));
  }

  const emOrdem = ordemDoBalcao(produtos);
  const baixos = new Set(produtos.filter((p) => p.abaixoDoMinimo).map((p) => p.id));
  const resumo = resumoDoBalcao(emOrdem, quantidades);
  const digitar = (id: string, texto: string) => setQuantidades((q) => ({ ...q, [id]: texto }));
  const tocar = (linha: LinhaDoBalcao, passo: 1 | -1) =>
    setQuantidades((q) => ({
      ...q,
      [linha.id]: textoDaQuantidade(quantidadeDepoisDoToque(q[linha.id] ?? "", passo, linha.saldo)),
    }));

  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      aria-label="Registrar venda"
      className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-6"
    >
      <section
        aria-labelledby="titulo-balcao"
        className="flex min-w-0 flex-col gap-3 lg:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1"
      >
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 id="titulo-balcao" className="text-lg font-bold">
            Produtos
          </h2>
          <span className="text-apagado text-sm">
            {produtos.length} à venda · toque em + para escolher
          </span>
        </div>
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3"
          aria-label="Produtos à venda"
        >
          {resumo.linhas.map((linha) => (
            <ProdutoNoBalcao
              key={linha.id}
              linha={linha}
              baixo={baixos.has(linha.id)}
              texto={quantidades[linha.id] ?? ""}
              aoDigitar={(texto) => digitar(linha.id, texto)}
              aoTocar={(passo) => tocar(linha, passo)}
            />
          ))}
        </ul>
      </section>

      {/* Na tela larga, uma coluna presa ao lado. No celular (e no computador estreito) os
          blocos seguem a lista e a barra do total fica presa embaixo, acima da barra de abas. */}
      <div className="xl:superficie-destaque max-xl:contents xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1 xl:flex xl:flex-col xl:gap-5 xl:overflow-hidden xl:rounded-[1.75rem] xl:p-5">
        <span
          aria-hidden="true"
          className="bg-ouro/15 pointer-events-none absolute -top-20 -right-16 size-56 rounded-full blur-3xl max-xl:hidden"
        />
        <section
          aria-labelledby="titulo-resumo-venda"
          className="max-xl:superficie relative flex flex-col gap-3 max-xl:rounded-[1.75rem] max-xl:p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-resumo-venda" className="flex items-center gap-2.5 text-lg font-bold">
              <SeloIcone nome="carrinho" tom="ouro" tamanho="p" />
              Resumo da venda
            </h2>
            <Selo tom={resumo.unidades > 0 ? "roxo" : "neutro"} semPonto>
              {resumo.unidades} {resumo.unidades === 1 ? "item" : "itens"}
            </Selo>
          </div>
          {resumo.escolhidos.length === 0 ? (
            <p className="border-borda text-apagado rounded-2xl border border-dashed px-4 py-5 text-center text-sm">
              Toque no + dos produtos para montar a venda.
            </p>
          ) : (
            <ul
              aria-label="Itens da venda"
              className="flex flex-col gap-1 xl:max-h-[34vh] xl:overflow-y-auto"
            >
              {resumo.escolhidos.map((l) => (
                <li
                  key={l.id}
                  className="animate-surgir flex items-center justify-between gap-3 rounded-xl py-1.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-lg px-1.5 text-xs font-bold tabular-nums ${
                        l.acimaDoSaldo ? "bg-perigo/15 text-perigo" : "bg-roxo/20 text-roxo-claro"
                      }`}
                    >
                      {l.quantidade}
                    </span>
                    <span className="truncate">{l.nome}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatarReais(l.subtotalCentavos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="max-xl:superficie relative max-xl:rounded-[1.75rem] max-xl:p-4">
          <OpcoesEmBlocos
            nome="forma"
            legenda="Forma de pagamento"
            opcoes={OPCOES_FORMA}
            padrao={estado.valores?.forma ?? "PIX"}
            colunas="grid-cols-2"
            idBase="forma-venda"
          />
        </div>

        <div className="max-xl:vidro xl:border-borda relative flex flex-col gap-3 max-xl:sticky max-xl:z-20 max-xl:rounded-[1.75rem] max-xl:p-2.5 max-xl:shadow-[0_20px_50px_-12px_rgb(0_0_0_/_0.9)] max-lg:bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] lg:col-span-2 lg:max-xl:bottom-4 xl:border-t xl:pt-5">
          {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
          <div className="flex items-center justify-between gap-3 xl:flex-col xl:items-stretch xl:gap-4">
            <p data-testid="total-venda" className="flex min-w-0 flex-col gap-1 max-xl:pl-2.5">
              <span className="text-apagado text-[0.68rem] font-bold tracking-[0.14em] uppercase">
                Total<span className="sr-only">:</span>
              </span>{" "}
              <ValorQueAcompanha
                centavos={resumo.totalCentavos}
                className="text-[1.65rem] leading-none font-extrabold tracking-tight sm:text-3xl xl:text-[2.6rem]"
              />
            </p>
            <BotaoEnviar
              enviando={enviando}
              textoEnviando="Registrando..."
              className={`${classeBotaoOuro} max-xl:px-5 xl:w-full`}
              icone={<Icone nome="carrinho" width={18} height={18} />}
            >
              Registrar venda
            </BotaoEnviar>
          </div>
          <p className="sr-only" aria-live="polite">
            {resumo.unidades === 0
              ? "Nenhum item na venda."
              : `${resumo.unidades} ${resumo.unidades === 1 ? "item" : "itens"} na venda, total ${formatarReais(resumo.totalCentavos)}.`}
          </p>
        </div>
      </div>
    </form>
  );
}

/** Um produto no balcão: nome, preço e saldo; − quantidade +; acende quando escolhido. */
function ProdutoNoBalcao({
  linha,
  baixo,
  texto,
  aoDigitar,
  aoTocar,
}: {
  linha: LinhaDoBalcao;
  baixo: boolean;
  texto: string;
  aoDigitar: (texto: string) => void;
  aoTocar: (passo: 1 | -1) => void;
}) {
  const { id, nome, precoCentavos, saldo, quantidade, podeMais, podeMenos, acimaDoSaldo } = linha;
  const esgotado = saldo <= 0;
  const escolhido = quantidade > 0;
  const noLimite = escolhido && quantidade === saldo;
  const campo = `qtd-${id}`;
  return (
    <li
      className={`ease-mola relative flex items-center gap-3 rounded-[1.5rem] border p-3.5 transition duration-300 sm:flex-col sm:items-stretch sm:gap-4 sm:p-4 ${
        acimaDoSaldo
          ? "border-perigo/60 bg-perigo/8"
          : escolhido
            ? "border-roxo/70 bg-roxo-forte/15 shadow-[0_18px_40px_-22px_rgb(166_103_252_/_0.95)]"
            : "border-borda bg-cartao hover:border-[#3a2f6b]"
      } ${esgotado ? "opacity-60" : ""}`}
    >
      {escolhido && (
        <span
          key={quantidade}
          aria-hidden="true"
          className={`animate-marcar absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums shadow-[0_6px_16px_-6px_rgb(0_0_0_/_0.8)] ${
            acimaDoSaldo ? "bg-perigo text-fundo" : "bg-roxo text-fundo"
          }`}
        >
          {formatarReais(linha.subtotalCentavos)}
        </span>
      )}
      <label htmlFor={campo} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1">
        <span className="line-clamp-2 leading-snug font-semibold">{nome}</span>
        <span className="text-apagado flex flex-wrap items-center gap-x-1.5 text-sm">
          <Valor centavos={precoCentavos} className="text-texto font-bold" />
          <span aria-hidden="true">·</span>
          {esgotado ? (
            <span className="text-perigo font-semibold">sem estoque</span>
          ) : (
            <span className={baixo ? "text-ouro" : ""}>tem {saldo}</span>
          )}
          {acimaDoSaldo ? (
            <span className="text-perigo font-semibold">· passou do saldo</span>
          ) : (
            noLimite && <span className="text-ouro font-semibold">· no limite</span>
          )}
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1.5 sm:justify-between">
        <button
          type="button"
          onClick={() => aoTocar(-1)}
          disabled={!podeMenos}
          className={`${classePasso} border-borda bg-elevado/60 text-texto hover:border-roxo/50 border`}
        >
          <Icone nome="menos" width={18} height={18} strokeWidth={2.4} />
          <span className="sr-only">Menos um {nome}</span>
        </button>
        <input
          id={campo}
          name={campo}
          type="number"
          inputMode="numeric"
          min={0}
          max={saldo}
          step={1}
          placeholder="0"
          disabled={esgotado}
          value={texto}
          onChange={(evento) => aoDigitar(evento.currentTarget.value)}
          className={`focus:ring-roxo/20 h-11 w-14 [appearance:textfield] rounded-2xl border text-center text-lg font-extrabold tabular-nums transition duration-200 focus:ring-4 focus:outline-none disabled:opacity-60 sm:flex-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            acimaDoSaldo
              ? "border-perigo/60 bg-perigo/10 text-perigo"
              : escolhido
                ? "border-roxo/60 bg-fundo/60 text-roxo-claro focus:border-roxo"
                : "border-borda bg-elevado/45 placeholder:text-apagado/70 focus:border-roxo"
          }`}
        />
        <button
          type="button"
          onClick={() => aoTocar(1)}
          disabled={!podeMais}
          className={`${classePasso} bg-linear-to-b from-[#8448f0] to-[#6d28d9] text-white shadow-[0_10px_24px_-10px_rgb(124_58_237_/_0.9)] hover:brightness-110`}
        >
          <Icone nome="mais" width={18} height={18} strokeWidth={2.4} />
          <span className="sr-only">Mais um {nome}</span>
        </button>
      </div>
    </li>
  );
}
