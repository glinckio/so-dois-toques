import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutAulas({ children }: LayoutProps<"/aulas">) {
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const links = [
    { href: "/aulas", rotulo: "Turmas" },
    { href: "/aulas/alunos", rotulo: admin ? "Alunos" : "Meus alunos" },
    ...(admin
      ? [
          { href: "/aulas/locais", rotulo: "Locais" },
          { href: "/aulas/planos", rotulo: "Planos" },
          { href: "/aulas/custos", rotulo: "Custos" },
          { href: "/aulas/resultado", rotulo: "Resultado" },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <Abas rotulo="Menu de Aulas" links={links} />
      {children}
    </div>
  );
}
