import Link from "next/link";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutAulas({ children }: LayoutProps<"/aulas">) {
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const links = [
    { href: "/aulas", rotulo: "Turmas" },
    { href: "/aulas/alunos", rotulo: admin ? "Alunos" : "Meus alunos" },
    ...(admin ? [{ href: "/aulas/locais", rotulo: "Locais" }] : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Menu de Aulas"
        className="flex gap-2 border-b border-current/10 pb-2 text-sm"
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
