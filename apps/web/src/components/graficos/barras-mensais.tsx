"use client";

import { useState } from "react";
import { escalaDoEixo, mesCurto, reaisCurto } from "@/lib/graficos/escala";
import { formatarReais, nomeDoMes } from "@/lib/mensalidades/formatacao";

export type MesDoGrafico = { competencia: string; receitas: number; despesas: number };

const SERIES = [
  { chave: "receitas", nome: "Receitas", classe: "fill-serie-1", amostra: "bg-serie-1" },
  { chave: "despesas", nome: "Despesas", classe: "fill-serie-2", amostra: "bg-serie-2" },
] as const;

/**
 * VIS-CA-04 e 06: receitas e despesas por mês em barras agrupadas, com legenda e
 * detalhe ao passar o dedo ou o mouse. No celular mostra só os últimos meses; a
 * tabela ao lado do gráfico traz todos os valores.
 */
export function BarrasMensais({
  meses,
  mesesNoCelular = 6,
}: {
  meses: readonly MesDoGrafico[];
  mesesNoCelular?: number;
}) {
  return (
    <figure className="flex flex-col gap-3" data-testid="grafico-mensal">
      <figcaption className="text-suave flex flex-wrap gap-4 text-sm">
        {SERIES.map((s) => (
          <span key={s.chave} className="inline-flex items-center gap-2">
            <span aria-hidden className={`size-3 rounded-sm ${s.amostra}`} />
            {s.nome}
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

const ALTURA = 240;
const MARGEM = { topo: 12, direita: 8, base: 26, esquerda: 60 };
const LARGURA_DICA = 200;
const ALTURA_DICA = 70;

function Grafico({ meses, largura }: { meses: readonly MesDoGrafico[]; largura: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = Math.max(0, ...meses.flatMap((m) => [m.receitas, m.despesas]));
  const { teto, passos } = escalaDoEixo(maximo);
  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const faixa = larguraUtil / Math.max(meses.length, 1);
  const barra = Math.min(18, faixa * 0.32);
  const y = (valor: number) => MARGEM.topo + alturaUtil - (valor / teto) * alturaUtil;
  const base = y(0);

  return (
    <svg
      viewBox={`0 0 ${largura} ${ALTURA}`}
      className="h-auto w-full select-none"
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
            className={p === 0 ? "stroke-borda" : "stroke-borda/50"}
            strokeDasharray={p === 0 ? undefined : "3 4"}
          />
          <text
            x={MARGEM.esquerda - 8}
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
        return (
          <g key={m.competencia}>
            {ativo === i && (
              <rect
                x={centro - faixa / 2 + 2}
                y={MARGEM.topo}
                width={faixa - 4}
                height={alturaUtil}
                rx={8}
                className="fill-elevado/70"
              />
            )}
            {SERIES.map((s, j) => {
              const valor = m[s.chave];
              const x = centro - barra - 1 + j * (barra + 2);
              return (
                <path
                  key={s.chave}
                  d={barraArredondada(x, y(valor), barra, base - y(valor))}
                  className={s.classe}
                />
              );
            })}
            <text
              x={centro}
              y={ALTURA - 8}
              textAnchor="middle"
              fontSize={11}
              className={ativo === i ? "fill-texto" : "fill-apagado"}
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
    <g pointerEvents="none" data-testid="dica-grafico">
      <rect
        x={x}
        y={MARGEM.topo}
        width={LARGURA_DICA}
        height={ALTURA_DICA}
        rx={10}
        className="fill-fundo stroke-borda"
      />
      <text x={x + 12} y={MARGEM.topo + 20} fontSize={12} fontWeight={600} className="fill-texto">
        {nomeDoMes(mes.competencia)}
      </text>
      {SERIES.map((s, j) => (
        <g key={s.chave}>
          <rect
            x={x + 12}
            y={MARGEM.topo + 32 + j * 18}
            width={9}
            height={9}
            rx={2}
            className={s.classe}
          />
          <text x={x + 27} y={MARGEM.topo + 40 + j * 18} fontSize={12} className="fill-suave">
            {s.nome}
          </text>
          <text
            x={x + LARGURA_DICA - 12}
            y={MARGEM.topo + 40 + j * 18}
            fontSize={12}
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

/** Barra com os cantos de cima arredondados (4px) e apoiada na linha de base. */
function barraArredondada(x: number, topo: number, largura: number, altura: number): string {
  if (altura <= 0) return "";
  const r = Math.min(4, altura, largura / 2);
  const base = topo + altura;
  return [
    `M${x},${base}`,
    `V${topo + r}`,
    `Q${x},${topo} ${x + r},${topo}`,
    `H${x + largura - r}`,
    `Q${x + largura},${topo} ${x + largura},${topo + r}`,
    `V${base}`,
    "Z",
  ].join(" ");
}
