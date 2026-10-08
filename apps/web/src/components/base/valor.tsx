import { formatarReais } from "@/lib/mensalidades/formatacao";

/** Divide "R$ 1.234,56" em "R$ 1.234" e ",56", para os centavos aparecerem menores. */
export function partesDoValor(centavos: number): { inteiro: string; centavos: string } {
  const texto = formatarReais(centavos);
  const virgula = texto.lastIndexOf(",");
  return virgula < 0
    ? { inteiro: texto, centavos: "" }
    : { inteiro: texto.slice(0, virgula), centavos: texto.slice(virgula) };
}

/** Dinheiro em destaque, com os centavos menores (o texto completo continua o mesmo). */
export function Valor({ centavos, className = "" }: { centavos: number; className?: string }) {
  const { inteiro, centavos: resto } = partesDoValor(centavos);
  return (
    <span className={`tabular-nums ${className}`}>
      {inteiro}
      <span className="text-[0.62em] font-semibold opacity-70">{resto}</span>
    </span>
  );
}
