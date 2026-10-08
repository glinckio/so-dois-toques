import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { SeloIcone } from "@/components/base/selo";
import { Vazio } from "@/components/base/vazio";
import { FormVenda } from "@/components/estoque/form-venda";
import { Aviso, classeBotaoSecundario } from "@/components/ui";
import type { Produto } from "@/lib/estoque/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { sessaoDoCaixa } from "@/lib/servidor/caixa";
import { exigirUsuario } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Vender | Só Dois Toques" };

/** ESTQ-CA-03 e VIVO-CA-07: venda no balcão; precisa de caixa aberto. */
export default async function PaginaVenda() {
  await connection();
  const usuario = await exigirUsuario();
  const [produtos, caixa] = await Promise.all([chamarApi<Produto[]>("/produtos"), sessaoDoCaixa()]);
  const ativos = produtos.ok ? produtos.dados.filter((p) => p.ativo) : [];
  return (
    <>
      <Cabecalho
        etiqueta="Lanchonete"
        icone="carrinho"
        titulo={
          <>
            Vender no <Destaque>balcão</Destaque>
          </>
        }
        descricao="Toque no + de cada produto, escolha a forma de pagamento e registre. O valor entra no Caixa na hora."
      />
      {caixa.ok && !caixa.dados.turno && (
        <div
          role="status"
          className="border-ouro/35 bg-ouro/10 animate-surgir flex flex-wrap items-center gap-3 rounded-[1.5rem] border px-4 py-3"
        >
          <SeloIcone nome="caixa" tom="ouro" />
          <p className="min-w-0 flex-1 text-sm">
            <strong className="block">O caixa está fechado.</strong>
            <span className="text-suave">A venda entra no turno aberto do Caixa.</span>
          </p>
          <Link href="/caixa" className={`${classeBotaoSecundario} min-h-11 px-5`}>
            Abra o caixa
          </Link>
        </div>
      )}
      {!produtos.ok ? (
        <Aviso tipo="erro">{produtos.mensagem}</Aviso>
      ) : ativos.length === 0 ? (
        <Vazio
          titulo="Nenhum produto ativo para vender."
          acao={
            usuario.perfil === "ADMINISTRADOR" && (
              <Link href="/estoque#cadastrar-produto" className={classeBotaoSecundario}>
                Cadastrar produto
              </Link>
            )
          }
        >
          Os produtos cadastrados e ativos aparecem aqui como blocos do balcão.
        </Vazio>
      ) : (
        <FormVenda
          produtos={ativos.map((p) => ({
            id: p.id,
            nome: p.nome,
            precoCentavos: p.precoCentavos,
            saldo: p.saldo,
            abaixoDoMinimo: p.abaixoDoMinimo,
          }))}
        />
      )}
    </>
  );
}
