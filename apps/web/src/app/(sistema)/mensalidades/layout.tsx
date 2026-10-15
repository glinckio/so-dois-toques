import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutMensalidades({ children }: LayoutProps<"/mensalidades">) {
  const { permitido } = await exigirArea("mensalidades");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/mensalidades", rotulo: "Mensalidades" },
    { href: "/mensalidades/inadimplentes", rotulo: "Inadimplentes" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Abas rotulo="Menu das Mensalidades" links={links} />
      </div>
      {children}
    </div>
  );
}
