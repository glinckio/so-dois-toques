import { connection } from "next/server";
import { AcessoNegado } from "@/components/ui";
import { MENU, type Area } from "@/lib/acesso/areas";
import { exigirArea } from "@/lib/servidor/sessao";

/** Áreas das próximas etapas: já protegidas por perfil, com o conteúdo a seguir. */
export async function AreaEmConstrucao({ area }: { area: Area }) {
  await connection();
  const { permitido } = await exigirArea(area);
  if (!permitido) return <AcessoNegado />;
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{MENU[area].rotulo}</h1>
      <p className="opacity-80">Esta área chega nas próximas etapas.</p>
    </section>
  );
}
