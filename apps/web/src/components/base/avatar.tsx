import { corDoAvatar, iniciais } from "@/lib/base/avatar";

const CORES = [
  "bg-roxo/20 text-roxo-claro ring-roxo/30",
  "bg-ouro/15 text-ouro ring-ouro/25",
  "bg-sucesso/15 text-sucesso ring-sucesso/25",
  "bg-sky-400/15 text-sky-300 ring-sky-400/25",
  "bg-pink-400/15 text-pink-300 ring-pink-400/25",
  "bg-areia/15 text-areia ring-areia/25",
];

const TAMANHOS = {
  p: "size-8 text-[0.7rem]",
  m: "size-10 text-sm",
  g: "size-14 text-lg",
  gg: "size-20 text-2xl",
};

/** Iniciais da pessoa em um círculo, com uma cor fixa por nome. */
export function Avatar({
  nome,
  tamanho = "m",
  className = "",
}: {
  nome: string;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ring-1 ${CORES[corDoAvatar(nome)]} ${TAMANHOS[tamanho]} ${className}`}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Avatares empilhados, com "+N" quando passa do máximo. */
export function GrupoAvatares({ nomes, maximo = 4 }: { nomes: readonly string[]; maximo?: number }) {
  const visiveis = nomes.slice(0, maximo);
  const resto = nomes.length - visiveis.length;
  return (
    <span className="flex -space-x-2" aria-hidden="true">
      {visiveis.map((nome, i) => (
        <Avatar key={`${nome}-${i}`} nome={nome} tamanho="p" className="outline-cartao outline-2" />
      ))}
      {resto > 0 && (
        <span className="bg-elevado text-suave outline-cartao inline-grid size-8 place-items-center rounded-full text-[0.7rem] font-bold outline-2">
          +{resto}
        </span>
      )}
    </span>
  );
}
