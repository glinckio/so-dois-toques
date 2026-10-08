import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Vazio } from "@/components/base/vazio";
import { FormCompra } from "@/components/estoque/form-compra";
import { Aviso, classeBotaoSecundario } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Produto } from "@/lib/estoque/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirUsuario } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Compra | Só Dois Toques" };

/** ESTQ-CA-02: entrada de mercadoria. `?produto=` já deixa o produto escolhido. */
export default async function PaginaCompra({ searchParams }: PageProps<"/estoque/compra">) {
  await connection();
  const usuario = await exigirUsuario();
  const { produto: pedido } = await searchParams;
  const produtos = await chamarApi<Produto[]>("/produtos");
  const ativos = produtos.ok ? produtos.dados.filter((p) => p.ativo) : [];
  const produtoInicial =
    typeof pedido === "string" && ativos.some((p) => p.id === pedido) ? pedido : "";
  return (
    <>
      <Cabecalho
        etiqueta="Lanchonete"
        icone="sacola"
        titulo={
          <>
            Registrar <Destaque>compra</Destaque>
          </>
        }
        descricao="O valor pago sai do Caixa na hora e o custo médio do produto é recalculado."
      />
      {!produtos.ok ? (
        <Aviso tipo="erro">{produtos.mensagem}</Aviso>
      ) : ativos.length === 0 ? (
        <Vazio
          titulo="Nenhum produto ativo."
          acao={
            usuario.perfil === "ADMINISTRADOR" && (
              <Link href="/estoque#cadastrar-produto" className={classeBotaoSecundario}>
                Cadastrar produto
              </Link>
            )
          }
        >
          Cadastre em Produtos para dar entrada na compra.
        </Vazio>
      ) : (
        <FormCompra
          produtos={ativos.map((p) => ({
            id: p.id,
            nome: p.nome,
            saldo: p.saldo,
            custoMedioCentavos: p.custoMedioCentavos,
            precoCentavos: p.precoCentavos,
          }))}
          hoje={hojeEmSaoPaulo()}
          produtoInicial={produtoInicial}
        />
      )}
    </>
  );
}
