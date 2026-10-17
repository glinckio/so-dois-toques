import { Icone } from "@/components/icones";
import { NOTAS, ROTULOS_DAS_NOTAS } from "@/lib/feedback/painel";

/** A nota de 1 a 5 em estrelas, com o texto para leitor de tela. */
export function Estrelas({ nota, tamanho = 18 }: { nota: number; tamanho?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Nota ${nota} de 5, ${ROTULOS_DAS_NOTAS[nota] ?? ""}`}
    >
      {NOTAS.map((n) => (
        <Icone
          key={n}
          nome="estrela"
          width={tamanho}
          height={tamanho}
          strokeWidth={1.6}
          className={n <= Math.round(nota) ? "fill-ouro text-ouro" : "text-apagado"}
        />
      ))}
    </span>
  );
}
