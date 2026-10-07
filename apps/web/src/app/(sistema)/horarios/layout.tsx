import Link from "next/link";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutHorarios({ children }: LayoutProps<"/horarios">) {
  const { permitido } = await exigirArea("horarios");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/horarios", rotulo: "Grade" },
    { href: "/horarios/nova", rotulo: "Nova reserva" },
    { href: "/horarios/fixas", rotulo: "Fixas" },
    { href: "/horarios/faixas", rotulo: "Preços e quadras" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Menu dos Horários"
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
