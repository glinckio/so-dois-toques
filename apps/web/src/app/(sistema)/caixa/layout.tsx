import Link from "next/link";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutCaixa({ children }: LayoutProps<"/caixa">) {
  const { permitido } = await exigirArea("caixa");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/caixa", rotulo: "Caixa do dia" },
    { href: "/caixa/mensalidades", rotulo: "Mensalidades" },
    { href: "/caixa/inadimplentes", rotulo: "Inadimplentes" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Menu do Caixa"
        className="flex flex-wrap gap-2 border-b border-current/10 pb-2 text-sm print:hidden"
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
