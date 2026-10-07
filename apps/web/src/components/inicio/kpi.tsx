import { Icone, type NomeIcone } from "@/components/icones";
import { NumeroAnimado } from "@/components/base/numero-animado";
import { SeloIcone, type Tom } from "@/components/base/selo";
import { formatarPorcentagem } from "@/lib/contabil/formatacao";
import { minigrafico } from "@/lib/graficos/escala";

const TRACOS: Partial<Record<Tom, { linha: string; area: string; ponto: string }>> = {
  roxo: { linha: "stroke-roxo", area: "fill-roxo/10", ponto: "fill-roxo" },
  ouro: { linha: "stroke-ouro", area: "fill-ouro/10", ponto: "fill-ouro" },
  sucesso: { linha: "stroke-sucesso", area: "fill-sucesso/10", ponto: "fill-sucesso" },
};

/**
 * Cartão de número do mês: ícone, valor que sobe ao abrir, a variação em relação
 * ao mês anterior (seta e texto, nunca só cor) e o minigráfico dos últimos meses.
 */
export function CartaoNumero({
  rotulo,
  icone,
  tom = "roxo",
  valor,
  serie = [],
  mudanca,
  mesAnterior,
  subirEhRuim = false,
  nota,
  destaque = false,
  testId,
}: {
  rotulo: string;
  icone: NomeIcone;
  tom?: Tom;
  valor: number;
  serie?: readonly number[];
  mudanca?: number | null;
  mesAnterior?: string;
  subirEhRuim?: boolean;
  nota?: string;
  destaque?: boolean;
  /** Padrão: `kpi-<rótulo>`. */
  testId?: string;
}) {
  const bom = mudanca != null && (subirEhRuim ? mudanca <= 0 : mudanca >= 0);
  const linha = minigrafico(serie, 120, 40);
  const traco = TRACOS[tom] ?? TRACOS.roxo!;
  return (
    <div
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-[1.6rem] p-5 transition duration-300 hover:-translate-y-0.5 ${
        destaque ? "superficie-destaque" : "superficie hover:border-[#3a2f6b]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <SeloIcone nome={icone} tom={tom} tamanho="p" />
          <span className="text-suave text-sm font-semibold">{rotulo}</span>
        </span>
        {mudanca != null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${bom ? "bg-sucesso/15 text-sucesso" : "bg-perigo/15 text-perigo"}`}
          >
            <Icone
              nome={mudanca >= 0 ? "subir" : "descer"}
              width={12}
              height={12}
              strokeWidth={2.4}
            />
            {formatarPorcentagem(Math.abs(mudanca))}
          </span>
        )}
      </div>
      <NumeroAnimado
        valor={valor}
        centavosMenores
        testId={testId ?? `kpi-${rotulo}`}
        className={`text-[1.75rem] leading-none font-extrabold tracking-tight ${valor < 0 ? "text-perigo" : ""}`}
      />
      <div className="flex items-end justify-between gap-3">
        <span className="text-apagado text-xs">
          {nota ??
            (mudanca == null
              ? "Sem mês anterior para comparar"
              : `${mudanca >= 0 ? "Acima" : "Abaixo"} de ${mesAnterior ?? "o mês anterior"}`)}
        </span>
        {linha && (
          <svg
            viewBox="-3 -3 126 46"
            className="h-10 w-24 shrink-0 overflow-visible"
            aria-hidden="true"
          >
            <path d={linha.area} className={`${traco.area} animate-entrar`} />
            <path
              d={linha.linha}
              fill="none"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
              strokeDasharray="100 200"
              className={`${traco.linha} animate-desenhar`}
            />
            <circle
              cx={linha.ultimo.x}
              cy={linha.ultimo.y}
              r={3.5}
              className={`${traco.ponto} animate-marcar [animation-delay:900ms]`}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
