import type { Metadata } from "next";
import { connection } from "next/server";
import { FormCompra } from "@/components/estoque/form-compra";
import { Aviso } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Produto } from "@/lib/estoque/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Compra | Só Dois Toques" };

/** ESTQ-CA-02: entrada de mercadoria. */
export default async function PaginaCompra() {
  await connection();
  const produtos = await chamarApi<Produto[]>("/produtos");
  const ativos = produtos.ok ? produtos.dados.filter((p) => p.ativo) : [];
  return (
    <>
      <h1 className="text-2xl font-semibold">Registrar compra</h1>
      <p className="text-suave">
        O valor pago sai do Caixa na hora e o custo médio do produto é recalculado.
      </p>
      {!produtos.ok ? (
        <Aviso tipo="erro">{produtos.mensagem}</Aviso>
      ) : ativos.length === 0 ? (
        <p className="text-suave">Nenhum produto ativo. Cadastre em Produtos.</p>
      ) : (
        <FormCompra
          produtos={ativos.map((p) => ({ id: p.id, nome: p.nome, saldo: p.saldo }))}
          hoje={hojeEmSaoPaulo()}
        />
      )}
    </>
  );
}
