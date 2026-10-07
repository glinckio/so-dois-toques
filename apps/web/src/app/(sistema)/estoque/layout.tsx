import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutEstoque({ children }: LayoutProps<"/estoque">) {
  const { permitido } = await exigirArea("estoque");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/estoque", rotulo: "Produtos" },
    { href: "/estoque/venda", rotulo: "Vender" },
    { href: "/estoque/compra", rotulo: "Compra" },
    { href: "/estoque/vendas", rotulo: "Vendas do dia" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Abas rotulo="Menu do Estoque" links={links} />
      {children}
    </div>
  );
}
