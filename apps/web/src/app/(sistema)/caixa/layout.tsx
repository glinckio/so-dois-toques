import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutCaixa({ children }: LayoutProps<"/caixa">) {
  const { permitido } = await exigirArea("caixa");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/caixa", rotulo: "Caixa do dia" },
    { href: "/caixa/turnos", rotulo: "Turnos" },
    { href: "/caixa/mensalidades", rotulo: "Mensalidades" },
    { href: "/caixa/inadimplentes", rotulo: "Inadimplentes" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <Abas rotulo="Menu do Caixa" links={links} />
      </div>
      {children}
    </div>
  );
}
