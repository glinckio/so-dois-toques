"use client";

import { useState } from "react";
import { escalaDoEixo, mesCurto, reaisCurto } from "@/lib/graficos/escala";
import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";

export type MesDoGrafico = { competencia: string; receitas: number; despesas: number };

const SERIES = [
  {
    chave: "receitas",
    nome: "Receitas",
    classe: "fill-serie-1",
    brilho: "drop-shadow-[0_0_10px_rgb(166_103_252_/_0.55)]",
    amostra: "bg-serie-1",
  },
  {
    chave: "despesas",
    nome: "Despesas",
    classe: "fill-serie-2",
    brilho: "drop-shadow-[0_0_10px_rgb(201_133_0_/_0.5)]",
    amostra: "bg-serie-2",
  },
] as const;

/**
 * VIS-CA-04 e 06: receitas e despesas por mês em barras de pílula, que crescem da
 * base uma depois da outra. O mês em foco (o atual, ou o que está sob o dedo ou o
 * mouse) fica aceso e com o valor escrito; os outros ficam mais apagados. No celular
 * mostra só os últimos meses; a tabela ao lado traz todos os valores.
 */
export function BarrasMensais({
  meses,
  mesesNoCelular = 6,
}: {
  meses: readonly MesDoGrafico[];
  mesesNoCelular?: number;
}) {
  return (
    <figure className="flex flex-col gap-4" data-testid="grafico-mensal">
      <figcaption className="text-suave flex flex-wrap gap-2 text-sm">
        {SERIES.map((s) => (
          <span
            key={s.chave}
            className="border-borda bg-elevado/50 inline-flex items-center gap-2 rounded-full border px-3 py-1"
          >
            <span aria-hidden className={`size-2.5 rounded-full ${s.amostra}`} />
            <span>{s.nome}</span>
          </span>
        ))}
      </figcaption>
      <div className="sm:hidden">
        <Grafico meses={meses.slice(-mesesNoCelular)} largura={360} />
      </div>
      <div className="hidden sm:block">
        <Grafico meses={meses} largura={720} />
      </div>
    </figure>
  );
}

const ALTURA = 260;
const MARGEM = { topo: 30, direita: 8, base: 34, esquerda: 58 };
const LARGURA_DICA = 204;
const ALTURA_DICA = 76;

function Grafico({ meses, largura }: { meses: readonly MesDoGrafico[]; largura: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = Math.max(0, ...meses.flatMap((m) => [m.receitas, m.despesas]));
  const { teto, passos } = escalaDoEixo(maximo);
  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const faixa = larguraUtil / Math.max(meses.length, 1);
  const barra = Math.min(16, faixa * 0.28);
  const y = (valor: number) => MARGEM.topo + alturaUtil - (Math.max(0, valor) / teto) * alturaUtil;
  const base = y(0);
  const emFoco = ativo ?? meses.length - 1;

  return (
    <svg
      viewBox={`0 0 ${largura} ${ALTURA}`}
      className="h-auto w-full overflow-visible select-none"
      role="img"
      aria-label="Receitas e despesas por mês. Os valores estão na tabela."
      onMouseLeave={() => setAtivo(null)}
    >
      {passos.map((p) => (
        <g key={p}>
          <line
            x1={MARGEM.esquerda}
            x2={largura - MARGEM.direita}
            y1={y(p)}
            y2={y(p)}
            className={p === 0 ? "stroke-borda" : "stroke-borda/45"}
            strokeDasharray={p === 0 ? undefined : "2 6"}
            strokeLinecap="round"
          />
          <text
            x={MARGEM.esquerda - 10}
            y={y(p)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={11}
            className="fill-apagado"
          >
            {reaisCurto(p)}
          </text>
        </g>
      ))}

      {meses.map((m, i) => {
        const centro = MARGEM.esquerda + faixa * i + faixa / 2;
        const aceso = i === emFoco;
        return (
          <g key={m.competencia}>
            {ativo === i && (
              <rect
                x={centro - faixa / 2 + 3}
                y={MARGEM.topo - 22}
                width={faixa - 6}
                height={alturaUtil + 22}
                rx={Math.min(18, (faixa - 6) / 2)}
                className="fill-elevado/60"
              />
            )}
            {SERIES.map((s, j) => {
              const valor = m[s.chave];
              const x = centro - barra - 2 + j * (barra + 4);
              return (
                <path
                  key={s.chave}
                  d={pilula(x, y(valor), barra, base - y(valor))}
                  className={`animate-crescer-y origem-base atraso-${Math.min(24, i)} transition-opacity duration-300 ${s.classe} ${aceso ? s.brilho : "opacity-40"}`}
                />
              );
            })}
            {aceso && (
              <rect
                x={centro - 19}
                y={ALTURA - 24}
                width={38}
                height={20}
                rx={10}
                className="fill-roxo-forte/35"
              />
            )}
            <text
              x={centro}
              y={ALTURA - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={aceso ? 700 : 500}
              className={aceso ? "fill-texto" : "fill-apagado"}
            >
              {mesCurto(m.competencia)}
            </text>
          </g>
        );
      })}

      {meses.map((m, i) => (
        <rect
          key={m.competencia}
          x={MARGEM.esquerda + faixa * i}
          y={0}
          width={faixa}
          height={ALTURA}
          fill="transparent"
          className="cursor-pointer"
          onMouseEnter={() => setAtivo(i)}
          onClick={() => setAtivo(i)}
        />
      ))}

      {ativo !== null && meses[ativo] && (
        <Dica
          mes={meses[ativo]}
          x={dicaX(MARGEM.esquerda + faixa * ativo + faixa / 2, faixa, largura)}
        />
      )}
    </svg>
  );
}

function dicaX(centro: number, faixa: number, largura: number): number {
  const direita = centro + faixa / 2 + 4;
  if (direita + LARGURA_DICA <= largura) return direita;
  return Math.max(0, centro - faixa / 2 - 4 - LARGURA_DICA);
}

function Dica({ mes, x }: { mes: MesDoGrafico; x: number }) {
  return (
    <g pointerEvents="none" data-testid="dica-grafico" className="animate-surgir">
      <rect
        x={x}
        y={MARGEM.topo - 8}
        width={LARGURA_DICA}
        height={ALTURA_DICA}
        rx={16}
        className="fill-noite/95 stroke-borda"
      />
      <text x={x + 14} y={MARGEM.topo + 13} fontSize={12} fontWeight={700} className="fill-texto">
        {nomeDoMes(mes.competencia)}
      </text>
      {SERIES.map((s, j) => (
        <g key={s.chave}>
          <circle cx={x + 18} cy={MARGEM.topo + 30 + j * 20} r={4} className={s.classe} />
          <text x={x + 29} y={MARGEM.topo + 34 + j * 20} fontSize={12} className="fill-suave">
            {s.nome}
          </text>
          <text
            x={x + LARGURA_DICA - 14}
            y={MARGEM.topo + 34 + j * 20}
            fontSize={12}
            fontWeight={600}
            textAnchor="end"
            className="fill-texto"
          >
            {formatarReais(mes[s.chave])}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Barra de pílula: topo arredondado (meio círculo quando cabe), reta na linha de base. */
function pilula(x: number, topo: number, largura: number, altura: number): string {
  if (altura <= 0) return "";
  const r = Math.min(largura / 2, altura);
  const k = r * 0.4477; // 1 - 0,5523: o controle da curva que imita o círculo
  const base = topo + altura;
  return [
    `M${x},${base}`,
    `V${topo + r}`,
    `C${x},${topo + k} ${x + k},${topo} ${x + r},${topo}`,
    `H${x + largura - r}`,
    `C${x + largura - k},${topo} ${x + largura},${topo + k} ${x + largura},${topo + r}`,
    `V${base}`,
    "Z",
  ].join(" ");
}
