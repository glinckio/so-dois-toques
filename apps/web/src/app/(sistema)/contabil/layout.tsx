import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

/** GASTO-CA-09 e ENTRADA-CA-05: o Contábil, os gastos, as entradas e os contratos são só do administrador. */
export default async function LayoutContabil({ children }: LayoutProps<"/contabil">) {
  const { permitido } = await exigirArea("contabil");
  if (!permitido) return <AcessoNegado />;
  return (
    <div className="flex flex-col gap-6">
      <Abas
        rotulo="Menu do Contábil"
        links={[
          { href: "/contabil", rotulo: "Painel" },
          { href: "/contabil/gastos", rotulo: "Gastos" },
          { href: "/contabil/entradas", rotulo: "Entradas" },
          { href: "/contabil/contratos", rotulo: "Aluguel mensal" },
        ]}
      />
      {children}
    </div>
  );
}
