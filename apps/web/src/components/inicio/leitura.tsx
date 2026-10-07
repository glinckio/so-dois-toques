import { BolaBrilhante } from "@/components/base/bola";
import { Icone, type NomeIcone } from "@/components/icones";

const ICONES: NomeIcone[] = ["contabil", "porcentagem", "relogio"];

/** Leitura do mês: o que os números dizem, em frases curtas, ao lado da bola. */
export function LeituraDoMes({ frases }: { frases: readonly string[] }) {
  return (
    <section
      aria-labelledby="titulo-leitura"
      className="superficie relative flex flex-col gap-5 overflow-hidden rounded-[1.75rem] p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <span className="bg-roxo/15 absolute -top-20 -left-16 size-56 rounded-full blur-3xl" aria-hidden="true" />
      <div className="relative flex shrink-0 items-center gap-4 sm:w-56">
        <BolaBrilhante tamanho={52} />
        <div>
          <h2 id="titulo-leitura" className="text-lg leading-tight font-bold">
            Leitura do mês
          </h2>
          <p className="text-apagado text-sm">O que os números dizem</p>
        </div>
      </div>
      <ul className="relative grid flex-1 gap-3 md:grid-cols-3">
        {frases.map((frase, i) => (
          <li
            key={frase}
            className={`border-borda bg-elevado/35 animate-entrar flex items-start gap-3 rounded-2xl border p-3.5 text-sm atraso-${i * 3 + 2}`}
          >
            <span className="bg-roxo/15 text-roxo-claro grid size-8 shrink-0 place-items-center rounded-xl">
              <Icone nome={ICONES[i % ICONES.length]!} width={16} height={16} />
            </span>
            <span className="text-suave self-center">{frase}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
