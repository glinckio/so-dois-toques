import type { Metadata } from "next";
import { connection } from "next/server";
import { estornarCompra } from "@/app/acoes/estoque";
import { FormAjuste } from "@/components/estoque/form-ajuste";
import { FormProduto } from "@/components/estoque/form-produto";
import { FormMotivo } from "@/components/mensalidades/form-motivo";
import { Aviso } from "@/components/ui";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import { formatarData } from "@/lib/aulas/formatacao";
import { TIPOS_MOVIMENTO } from "@/lib/estoque/formatacao";
import type { CompraDoProduto, Extrato } from "@/lib/estoque/tipos";
import { FORMAS, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Produto | Só Dois Toques" };

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

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">{produto.nome}</h1>
        <p className="opacity-80" data-testid="resumo-produto">
          {produto.saldo} em estoque · {formatarReais(produto.precoCentavos)} · custo médio{" "}
          {formatarReais(produto.custoMedioCentavos)} · mínimo {produto.estoqueMinimo}
          {produto.abaixoDoMinimo && " · abaixo do mínimo"}
          {produto.ativo ? "" : " · inativo"}
        </p>
      </header>
      {admin && <FormProduto produto={produto} />}
      {admin && <FormAjuste produtoId={produto.id} />}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Movimentações</h2>
        {movimentos.length === 0 ? (
          <p className="opacity-80">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm" aria-label="Movimentações">
              <thead>
                <tr className="border-b border-current/15">
                  <th className="py-2 font-medium">Quando</th>
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 text-right font-medium">Quantidade</th>
                  <th className="py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m) => (
                  <tr key={m.id} className="border-b border-current/10">
                    <td className="py-2">
                      {formatarDataHora(m.criadoEm)}
                      <span className="block text-xs opacity-80">{m.criadoPor}</span>
                    </td>
                    <td className="py-2">
                      {TIPOS_MOVIMENTO[m.tipo]}
                      {m.motivo && <span className="block text-xs opacity-80">{m.motivo}</span>}
                    </td>
                    <td className="py-2 text-right">
                      {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                    </td>
                    <td className="py-2 text-right font-medium">{m.saldoDepois}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {compras.ok && compras.dados.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Compras</h2>
          <ul className="flex flex-col gap-2" aria-label="Compras">
            {compras.dados.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-md border border-current/10 p-3"
              >
                <p className={c.estornadaEm ? "line-through opacity-70" : ""}>
                  {c.quantidade} por {formatarReais(c.totalCentavos)} · {FORMAS[c.forma]} ·{" "}
                  {formatarData(c.data)} · {c.feitaPor}
                </p>
                {c.estornadaEm ? (
                  <Aviso tipo="info">
                    Estornada em {formatarDataHora(c.estornadaEm)}. Motivo: {c.motivoEstorno}
                  </Aviso>
                ) : (
                  admin && (
                    <details>
                      <summary className="cursor-pointer text-sm underline">Estornar</summary>
                      <div className="pt-2">
                        <FormMotivo
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
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
