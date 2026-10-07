"use client";

import { useActionState, useState } from "react";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { registrarCompra } from "@/app/acoes/estoque";
import { CabecalhoCartao } from "@/components/base/cartao";
import { BotaoEnviar } from "@/components/base/enviar";
import { ICONES_DAS_FORMAS, OpcoesEmBlocos, type Opcao } from "@/components/base/opcoes";
import { ValorQueAcompanha } from "@/components/base/valor-que-acompanha";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeBotao, classeCampo, classeRotulo } from "@/components/ui";
import {
  FORMAS_CURTAS,
  custoMedioPrevisto,
  custoPorUnidade,
  formatarMargem,
  margemSobrePreco,
} from "@/lib/estoque/resumos";
import { centavosDe, type Forma, formatarReais } from "@/lib/mensalidades/formatacao";

export type ProdutoDaCompra = {
  id: string;
  nome: string;
  saldo: number;
  custoMedioCentavos: number;
  precoCentavos: number;
};

type Campos = { produtoId: string; quantidade: string; total: string };

const OPCOES_FORMA: Opcao[] = (Object.keys(FORMAS_CURTAS) as Forma[]).map((forma) => ({
  valor: forma,
  rotulo: FORMAS_CURTAS[forma],
  icone: ICONES_DAS_FORMAS[forma],
  detalhe: forma.startsWith("CARTAO") ? "Cartão" : undefined,
}));

function camposDe(valores: Record<string, string> | undefined, produtoInicial: string): Campos {
  return {
    produtoId: valores?.produtoId ?? produtoInicial,
    quantidade: valores?.quantidade ?? "",
    total: valores?.total ?? "",
  };
}

/**
 * ESTQ-CA-02: entrada de mercadoria paga na hora. Ao lado dos campos, o custo por
 * unidade e o que muda no produto (saldo, custo médio e margem) aparecem na hora.
 */
export function FormCompra({
  produtos,
  hoje,
  produtoInicial = "",
}: {
  produtos: ProdutoDaCompra[];
  hoje: string;
  produtoInicial?: string;
}) {
  const [estado, acao, enviando] = useActionState(registrarCompra, ESTADO_INICIAL);
  const valor = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;
  const [campos, setCampos] = useState<Campos>(() => camposDe(undefined, produtoInicial));
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estadoVisto !== estado) {
    setEstadoVisto(estado);
    setCampos(camposDe(estado.valores, produtoInicial));
  }

  const produto = produtos.find((p) => p.id === campos.produtoId);
  const quantidade = /^\d+$/.test(campos.quantidade.trim()) ? Number(campos.quantidade) : 0;
  const totalCentavos = campos.total.trim() ? centavosDe(campos.total) : null;
  const porUnidade = custoPorUnidade(totalCentavos, quantidade);
  const novoCusto =
    produto && porUnidade !== null && totalCentavos !== null
      ? custoMedioPrevisto(produto.saldo, produto.custoMedioCentavos, quantidade, totalCentavos)
      : null;
  const margemAntes = produto
    ? margemSobrePreco(produto.precoCentavos, produto.custoMedioCentavos)
    : null;
  const margemDepois =
    produto && novoCusto !== null ? margemSobrePreco(produto.precoCentavos, novoCusto) : null;

  return (
    <form
      key={JSON.stringify(estado.valores ?? null)}
      action={acao}
      onChange={(evento) => {
        const dados = new FormData(evento.currentTarget);
        setCampos({
          produtoId: String(dados.get("produtoId") ?? ""),
          quantidade: String(dados.get("quantidade") ?? ""),
          total: String(dados.get("total") ?? ""),
        });
      }}
      aria-label="Registrar compra"
      className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-6"
    >
      <div className="superficie flex flex-col gap-5 rounded-[1.75rem] p-5 sm:p-6">
        <CabecalhoCartao
          icone="sacola"
          tom="sucesso"
          titulo="O que chegou"
          descricao="Escolha o item, quantas unidades vieram e quanto foi pago."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="produtoId" className={classeRotulo}>
            Produto
          </label>
          <select
            id="produtoId"
            name="produtoId"
            required
            className={classeCampo}
            defaultValue={valor("produtoId", produtoInicial)}
          >
            <option value="">Escolha</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} (tem {p.saldo})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Quantidade"
            id="quantidade"
            icone="estoque"
            type="number"
            min={1}
            max={10000}
            required
            placeholder="12"
            defaultValue={valor("quantidade")}
          />
          <Campo
            rotulo="Valor total pago (R$)"
            id="total"
            prefixo="R$"
            inputMode="decimal"
            required
            placeholder="60,00"
            defaultValue={valor("total")}
          />
        </div>
        <Campo
          rotulo="Data do pagamento"
          id="data"
          icone="calendario"
          type="date"
          required
          max={hoje}
          defaultValue={valor("data", hoje)}
        />
        <OpcoesEmBlocos
          nome="forma"
          legenda="Forma de pagamento"
          opcoes={OPCOES_FORMA}
          padrao={valor("forma", "PIX")}
          colunas="grid-cols-2"
          idBase="forma-compra"
        />
      </div>

      <div className="superficie-destaque relative flex flex-col gap-5 overflow-hidden rounded-[1.75rem] p-5 sm:p-6 xl:sticky xl:top-6">
        <span
          aria-hidden="true"
          className="bg-sucesso/10 pointer-events-none absolute -top-20 -right-16 size-56 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-1.5">
          <p className="text-roxo-claro text-xs font-bold tracking-[0.14em] uppercase">
            Custo por unidade
          </p>
          <p className="text-[2.6rem] leading-none font-extrabold tracking-tight">
            {porUnidade === null ? (
              <span className="text-apagado">—</span>
            ) : (
              <ValorQueAcompanha centavos={porUnidade} />
            )}
          </p>
          <p className="text-apagado text-sm">
            {porUnidade !== null && totalCentavos !== null
              ? `${formatarReais(totalCentavos)} por ${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}`
              : "Preencha a quantidade e o valor pago."}
          </p>
        </div>

        <dl className="relative flex flex-col gap-2">
          <Mudanca
            titulo="Saldo"
            antes={produto ? String(produto.saldo) : null}
            depois={produto && quantidade > 0 ? String(produto.saldo + quantidade) : null}
            sobe
          />
          <Mudanca
            titulo="Custo médio"
            antes={produto ? formatarReais(produto.custoMedioCentavos) : null}
            depois={novoCusto !== null ? formatarReais(novoCusto) : null}
          />
          <Mudanca
            titulo={produto ? `Margem a ${formatarReais(produto.precoCentavos)}` : "Margem"}
            antes={produto ? (margemAntes === null ? "—" : formatarMargem(margemAntes)) : null}
            depois={margemDepois !== null ? formatarMargem(margemDepois) : null}
            alerta={margemDepois !== null && margemDepois < 0}
          />
        </dl>

        <p className="text-apagado relative flex items-start gap-2 text-xs">
          <Icone nome="caixa" width={15} height={15} className="text-ouro mt-px shrink-0" />O valor
          pago sai do Caixa na hora e o custo médio é recalculado ao registrar.
        </p>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Registrando..."
          className={`${classeBotao} w-full`}
          icone={<Icone nome="sacola" width={18} height={18} />}
        >
          Registrar compra
        </BotaoEnviar>
      </div>
    </form>
  );
}

/** Uma linha "antes → depois" do resumo da compra. */
function Mudanca({
  titulo,
  antes,
  depois,
  sobe = false,
  alerta = false,
}: {
  titulo: string;
  antes: string | null;
  depois: string | null;
  sobe?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="bg-fundo/40 flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5">
      <dt className="text-apagado text-sm">{titulo}</dt>
      <dd className="flex items-center gap-2 text-sm font-semibold tabular-nums">
        {antes === null ? (
          <span className="text-apagado">—</span>
        ) : (
          <>
            <span className={depois === null ? "" : "text-apagado"}>{antes}</span>
            {depois !== null && (
              <>
                <Icone nome="seta" width={14} height={14} className="text-apagado" />
                <span className="sr-only">passa para</span>
                <span
                  key={depois}
                  className={`animate-marcar inline-block ${
                    alerta ? "text-perigo" : sobe ? "text-sucesso" : "text-texto"
                  }`}
                >
                  {depois}
                </span>
              </>
            )}
          </>
        )}
      </dd>
    </div>
  );
}
