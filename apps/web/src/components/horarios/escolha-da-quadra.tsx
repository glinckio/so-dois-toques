import Link from "next/link";
import type { Quadra } from "@/lib/horarios/tipos";

/** GASTO-CA-02: a agenda mostra uma quadra por vez; aqui se troca de quadra. */
export function EscolhaDaQuadra({
  quadras,
  atual,
  data,
}: {
  quadras: readonly Quadra[];
  atual: string;
  data: string;
}) {
  return (
    <nav aria-label="Escolher quadra" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-2">
        {quadras.map((q) => {
          const escolhida = q.id === atual;
          return (
            <li key={q.id}>
              <Link
                href={`/horarios?data=${data}&quadra=${q.id}`}
                aria-current={escolhida ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition ${
                  escolhida
                    ? "border-roxo bg-roxo-forte/25 text-texto"
                    : "border-borda bg-elevado/50 text-suave hover:border-roxo/50 hover:text-texto"
                }`}
              >
                {q.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
