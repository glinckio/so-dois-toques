import { Abas } from "@/components/layout/abas";
import { AcessoNegado } from "@/components/ui";
import { exigirArea } from "@/lib/servidor/sessao";

export default async function LayoutHorarios({ children }: LayoutProps<"/horarios">) {
  const { permitido, usuario } = await exigirArea("horarios");
  if (!permitido) return <AcessoNegado />;
  const links = [
    { href: "/horarios", rotulo: "Agenda" },
    ...(usuario.perfil === "ADMINISTRADOR"
      ? [{ href: "/horarios/bloquear", rotulo: "Bloquear horário" }]
      : []),
    { href: "/horarios/semanais", rotulo: "Bloqueios semanais" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Abas rotulo="Menu dos Horários" links={links} />
      {children}
    </div>
  );
}
