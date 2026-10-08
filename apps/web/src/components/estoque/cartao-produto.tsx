import Link from "next/link";
import { BarraNivel } from "@/components/base/barra";
import { Selo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { nivelDoEstoque, type Situacao } from "@/lib/estoque/resumos";
import type { Produto } from "@/lib/estoque/tipos";
import { formatarReais } from "@/lib/mensalidades/formatacao";

const TOM_DA_BARRA: Record<Situacao, "perigo" | "ouro" | "roxo"> = {
  zerado: "perigo",
  baixo: "ouro",
  ok: "roxo",
};

const BORDA: Record<Situacao, string> = {
  zerado: "border-perigo/40",
  baixo: "border-ouro/40",
  ok: "",
};

/** Situação do produto em selo: ponto e texto, nunca só cor. */
export function SeloDoEstoque({ produto }: { produto: Produto }) {
  if (!produto.ativo) return <Selo tom="neutro">Inativo</Selo>;
  const { situacao } = nivelDoEstoque(produto);
  if (situacao === "zerado")
    return (
      <Selo tom="perigo" pulsar>
        Sem estoque
      </Selo>
    );
  if (situacao === "baixo")
    return (
      <Selo tom="ouro" pulsar>
        Abaixo do mínimo
      </Selo>
    );
  return <Selo tom="sucesso">Em dia</Selo>;
}

/**
 * ESTQ-CA-07: cartão do produto na prateleira. O saldo em número grande, o preço com
 * os centavos menores e a barra do nível com a marca do mínimo.
 */
export function CartaoProduto({ produto, ordem }: { produto: Produto; ordem: number }) {
  const nivel = nivelDoEstoque(produto);
  const situacao = produto.ativo ? nivel.situacao : "ok";
  return (
    <li className={`animate-entrar atraso-${Math.min(ordem, 16)}`}>
      <Link
        href={`/estoque/produtos/${produto.id}`}
        className={`superficie group ease-mola hover:border-roxo/50 flex h-full flex-col gap-4 rounded-[1.5rem] p-4 transition duration-300 hover:-translate-y-0.5 sm:p-5 ${BORDA[situacao]} ${produto.ativo ? "" : "opacity-60"}`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="group-hover:text-roxo-claro block truncate text-[1.05rem] font-bold transition-colors">
              {produto.nome}
            </span>
            <span className="text-apagado block text-xs">
              custo médio {formatarReais(produto.custoMedioCentavos)}
            </span>
          </span>
          <Valor centavos={produto.precoCentavos} className="shrink-0 text-lg font-extrabold" />
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="flex items-baseline gap-1.5">
            <span
              className={`text-[2rem] leading-none font-extrabold tracking-tight tabular-nums ${
                situacao === "zerado" ? "text-perigo" : ""
              }`}
            >
              {produto.saldo}
            </span>
            <span className="text-apagado text-sm">
              {produto.saldo === 1 ? "unidade" : "unidades"}
            </span>
          </span>
          <SeloDoEstoque produto={produto} />
        </span>
        <span className="flex flex-col gap-1.5">
          <BarraNivel
            fracao={nivel.fracao}
            marca={nivel.marca}
            tom={TOM_DA_BARRA[situacao]}
            altura="h-2"
            rotulo={
              produto.estoqueMinimo > 0
                ? `${produto.saldo} em estoque; mínimo ${produto.estoqueMinimo}`
                : `${produto.saldo} em estoque; sem mínimo definido`
            }
          />
          <span className="text-apagado text-center text-[0.7rem] font-semibold" aria-hidden="true">
            {produto.estoqueMinimo > 0 ? `mínimo ${produto.estoqueMinimo}` : "sem mínimo"}
          </span>
        </span>
      </Link>
    </li>
  );
}
