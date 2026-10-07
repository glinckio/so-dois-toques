import Link from "next/link";
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
      <nav
        aria-label="Menu do Estoque"
        className="flex flex-wrap gap-2 border-b border-current/10 pb-2 text-sm"
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 hover:bg-current/10">
            {l.rotulo}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
