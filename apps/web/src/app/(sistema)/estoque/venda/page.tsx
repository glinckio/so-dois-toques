import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FormVenda } from "@/components/estoque/form-venda";
import { Aviso } from "@/components/ui";
import type { Turno } from "@/lib/caixa/tipos";
import type { Produto } from "@/lib/estoque/tipos";
import { chamarApi } from "@/lib/servidor/api";

export const metadata: Metadata = { title: "Vender | Só Dois Toques" };

/** ESTQ-CA-03: venda no balcão; precisa de caixa aberto. */
export default async function PaginaVenda() {
  await connection();
  const [produtos, caixa] = await Promise.all([
    chamarApi<Produto[]>("/produtos"),
    chamarApi<{ turno: Turno | null }>("/caixa/sessao"),
  ]);
  const ativos = produtos.ok ? produtos.dados.filter((p) => p.ativo) : [];
  return (
    <>
      <h1 className="text-2xl font-semibold">Vender</h1>
      {caixa.ok && !caixa.dados.turno && (
        <Aviso tipo="info">
          O caixa está fechado.{" "}
          <Link href="/caixa" className="underline">
            Abra o caixa
          </Link>{" "}
          para vender.
        </Aviso>
      )}
      {!produtos.ok ? (
        <Aviso tipo="erro">{produtos.mensagem}</Aviso>
      ) : ativos.length === 0 ? (
        <p className="text-suave">Nenhum produto ativo para vender.</p>
      ) : (
        <FormVenda
          produtos={ativos.map((p) => ({
            id: p.id,
            nome: p.nome,
            precoCentavos: p.precoCentavos,
            saldo: p.saldo,
          }))}
        />
      )}
    </>
  );
}
