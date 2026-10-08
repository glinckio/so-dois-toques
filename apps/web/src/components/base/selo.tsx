import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/icones";

export type Tom = "roxo" | "ouro" | "sucesso" | "perigo" | "neutro" | "areia";

const TONS: Record<Tom, string> = {
  roxo: "bg-roxo/15 text-roxo-claro",
  ouro: "bg-ouro/15 text-ouro",
  sucesso: "bg-sucesso/15 text-sucesso",
  perigo: "bg-perigo/15 text-perigo",
  neutro: "bg-elevado text-suave",
  areia: "bg-areia/15 text-areia",
};

const PONTOS: Record<Tom, string> = {
  roxo: "bg-roxo text-roxo",
  ouro: "bg-ouro text-ouro",
  sucesso: "bg-sucesso text-sucesso",
  perigo: "bg-perigo text-perigo",
  neutro: "bg-apagado text-apagado",
  areia: "bg-areia text-areia",
};

/** Situação em pílula: ponto colorido e texto (nunca só cor). */
export function Selo({
  tom = "neutro",
  children,
  pulsar = false,
  semPonto = false,
  className = "",
}: {
  tom?: Tom;
  children: ReactNode;
  pulsar?: boolean;
  semPonto?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONS[tom]} ${className}`}
    >
      {!semPonto && (
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${PONTOS[tom]} ${pulsar ? "animate-pulsar" : ""}`}
        />
      )}
      {children}
    </span>
  );
}

/** Ícone dentro de um quadrado arredondado colorido. */
export function SeloIcone({
  nome,
  tom = "roxo",
  tamanho = "m",
}: {
  nome: NomeIcone;
  tom?: Tom;
  tamanho?: "p" | "m" | "g";
}) {
  const medidas = { p: "size-8 rounded-xl", m: "size-10 rounded-2xl", g: "size-12 rounded-2xl" };
  const icone = { p: 16, m: 19, g: 22 };
  return (
    <span className={`grid shrink-0 place-items-center ${medidas[tamanho]} ${TONS[tom]}`}>
      <Icone nome={nome} width={icone[tamanho]} height={icone[tamanho]} />
    </span>
  );
}

/** Ponto "ao vivo" que pulsa (caixa aberto, estoque baixo). */
export function PontoVivo({ tom = "sucesso" }: { tom?: Tom }) {
  return (
    <span
      aria-hidden="true"
      className={`animate-pulsar inline-block size-2.5 rounded-full ${PONTOS[tom]}`}
    />
  );
}
