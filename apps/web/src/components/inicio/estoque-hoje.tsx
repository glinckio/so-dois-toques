import Link from "next/link";
import { BarraNivel } from "@/components/base/barra";
import { Cartao, CabecalhoCartao, LinkDoCartao } from "@/components/base/cartao";
import { PontoVivo } from "@/components/base/selo";
import { Aviso } from "@/components/ui";
import type { Produto } from "@/lib/estoque/tipos";
import type { RespostaApi } from "@/lib/servidor/api";

/**
 * Estoque: quando tudo está acima do mínimo, um "check" que se desenha; senão, os
 * produtos que pedem compra, cada um com a barra do saldo e a marca do mínimo.
 */
export function EstoqueDeHoje({ resposta }: { resposta: RespostaApi<Produto[]> }) {
  const ativos = resposta.ok ? resposta.dados.filter((p) => p.ativo) : [];
  const baixos = ativos
    .filter((p) => p.abaixoDoMinimo)
    .sort((a, b) => a.saldo / Math.max(1, a.estoqueMinimo) - b.saldo / Math.max(1, b.estoqueMinimo));
  return (
    <Cartao aria-labelledby="titulo-estoque-hoje" className="flex flex-col gap-5">
      <CabecalhoCartao
        id="titulo-estoque-hoje"
        icone="estoque"
        tom="sucesso"
        titulo="Estoque"
        descricao={resposta.ok ? `${ativos.length} produtos à venda` : undefined}
        acao={<LinkDoCartao href="/estoque">Ver o estoque</LinkDoCartao>}
      />
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : baixos.length === 0 ? (
        <div className="border-sucesso/25 bg-sucesso/8 flex items-center gap-4 rounded-2xl border p-4">
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
          <p className="text-sm" data-testid="estoque-baixo">
            <strong className="block">Tudo em dia</strong>
            <span className="text-suave">Todos os produtos acima do mínimo.</span>
          </p>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2.5 text-sm font-semibold" data-testid="estoque-baixo">
            <PontoVivo tom="perigo" />
            {baixos.length} {baixos.length === 1 ? "produto abaixo" : "produtos abaixo"} do mínimo
          </p>
          <ul className="flex flex-col gap-1" aria-label="Produtos abaixo do mínimo">
            {baixos.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/estoque/produtos/${p.id}`}
                  className="hover:bg-elevado/60 flex flex-col gap-2 rounded-2xl px-2.5 py-2 transition-colors"
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{p.nome}</span>
                    <span className="text-apagado shrink-0 text-xs tabular-nums">
                      <strong className={p.saldo === 0 ? "text-perigo" : "text-ouro"}>{p.saldo}</strong>{" "}
                      de {p.estoqueMinimo} no mínimo
                    </span>
                  </span>
                  <BarraNivel
                    fracao={p.saldo / Math.max(1, p.estoqueMinimo * 2)}
                    marca={0.5}
                    tom={p.saldo === 0 ? "perigo" : "ouro"}
                    altura="h-2"
                    rotulo={`${p.nome}: ${p.saldo} em estoque, mínimo ${p.estoqueMinimo}`}
                  />
                </Link>
              </li>
            ))}
          </ul>
          {baixos.length > 5 && (
            <p className="text-apagado text-xs">E mais {baixos.length - 5} produtos.</p>
          )}
        </>
      )}
    </Cartao>
  );
}
